#!/usr/bin/env bash
# The local full stack (docker-compose.yml): build, run and poke at the app as prod runs it.
# Run `scripts/local.sh help` for the commands.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FIXTURE="backend/src/test/resources/engine/simulate-result.sample.json"
PLAN_FIXTURE="backend/src/test/resources/engine/plan-result.sample.json"
STEP_SECONDS="${STEP_SECONDS:-15}"

compose() { docker compose "$@"; }
redis() { compose exec -T redis redis-cli "$@"; }

usage() {
  cat <<'EOF'
Usage: scripts/local.sh <command>

  up [--no-build]   Build images from this working tree, start everything, wait until healthy
  down              Stop the stack (data is kept)
  reset [-y]        Stop the stack and delete its Postgres data
  status            Containers, health and memory use (the backend has prod's 576M limit)
  logs [service]    Follow logs (backend, frontend, postgres, redis)
  psql              A psql shell on the local database
  redis [args]      redis-cli in the Redis container (e.g. `redis keys 'vsr:*'`)
  worker [outcome] [jobs]
                    Play the matchup engine's worker for the next job, with the sample result
                    (simulate or plan, by the job's kind). Outcome: complete (default), fail, or
                    partial (holds there until Cancel). jobs: how many to play, one after another
                    as the real worker does (default 1; 0 = until Ctrl-C), e.g. `worker complete 0`
                    for a batch of Matchup Planner plans. Waits for a job if none is queued;
                    honours Cancel. STEP_SECONDS=15 per stage.

URLs: app http://localhost:3000, API http://localhost:8080 (Swagger at /swagger-ui.html).

Settings go in a .env file at the repo root (gitignored), for example:
  ENGINE_ALLOWED_USERS=your-username     # who may run simulations (exact, comma-separated)
  ENGINE_JOBS_ENABLED=false              # see the app with the engine feature off
  ENGINE_WORKER_INSTANCE_IDS=i-0000000000000000a   # fake ID: loads the AWS SDK, for memory checks
EOF
}

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker isn't running. Start OrbStack (or Docker Desktop) and try again." >&2
    exit 1
  fi
}

allowed_users() {
  local value="${ENGINE_ALLOWED_USERS:-}"
  if [[ -z "$value" && -f .env ]]; then
    value="$(sed -n 's/^ENGINE_ALLOWED_USERS=//p' .env | tail -1)"
  fi
  echo "$value"
}

cmd_up() {
  require_docker
  local build=(--build)
  [[ "${1:-}" == "--no-build" ]] && build=()
  echo "Building and starting (commit $(git rev-parse --short HEAD)$(git diff --quiet HEAD -- backend frontend || echo ', plus uncommitted changes'))..."
  compose up -d ${build[@]+"${build[@]}"} --wait --wait-timeout 300
  echo
  compose ps --format 'table {{.Service}}\t{{.Status}}'
  echo
  echo "App: http://localhost:3000   API: http://localhost:8080"
  if [[ -z "$(allowed_users)" ]]; then
    echo "Note: no ENGINE_ALLOWED_USERS in .env, so nobody can run a simulation."
  fi
}

cmd_reset() {
  if [[ "${1:-}" != "-y" ]]; then
    read -r -p "Delete the local Postgres data (users, teams, replays)? [y/N] " answer
    [[ "$answer" == "y" || "$answer" == "Y" ]] || exit 1
  fi
  compose down -v
}

cmd_status() {
  compose ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
  echo
  docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}' \
    $(compose ps -q)
}

# Sets a job's final result and status, and stops serving it.
# The result and the final status in one step, as the real worker's transaction does.
# Written apart, the backend could see the result, finish the job and delete its keys
# in between, and the status write would then leave the job's hash behind for good.
PUBLISH_LUA="redis.call('SET', KEYS[1], ARGV[2]); redis.call('HSET', KEYS[2], 'status', ARGV[1]); return 1"

publish() {
  local id="$1" json="$2" status="$3"
  printf '%s' "$json" | redis -x EVAL "$PUBLISH_LUA" 2 "vsr:result:$id" "vsr:job:$id" "$status" >/dev/null
  redis LREM vsr:processing:local 0 "$JOB" >/dev/null
  echo "Published a $status result."
}

failed_json() {
  jq -cn --arg id "$1" --arg code "$2" --arg message "$3" --arg kind "${KIND:-simulate}" \
    '{schema_version: 1, kind: $kind, job_id: $id, regulation: "gen9championsvgc2026regmc",
      status: "failed", error: {code: $code, message: $message}}'
}

# Between stages, publishes a cancelled result if the user pressed Cancel (and returns 1).
step() {
  local id="$1" label="$2"
  echo "$label"
  sleep "$STEP_SECONDS"
  if [[ "$(redis EXISTS "vsr:cancel:$id")" == "1" ]]; then
    publish "$id" "$(failed_json "$id" cancelled cancelled)" failed
    return 1
  fi
}

cmd_worker() {
  local outcome="${1:-complete}" jobs="${2:-1}"
  case "$outcome" in complete | fail | partial) ;; *) usage; exit 1 ;; esac
  [[ "$jobs" =~ ^[0-9]+$ ]] || { usage; exit 1; }
  command -v jq >/dev/null || { echo "This needs jq (brew install jq)." >&2; exit 1; }

  local played=0
  while [[ "$jobs" == 0 || "$played" -lt "$jobs" ]]; do
    play_one "$outcome"
    played=$((played + 1))
  done
}

# Claims the next job and plays it through, as its kind's worker stages do.
play_one() {
  local outcome="$1"
  echo "Waiting for a job (press Run simulation, or Simulate on the Matchup Planner)..."
  JOB="$(redis BLMOVE vsr:jobs vsr:processing:local RIGHT LEFT 0)"
  local id
  id="$(jq -r .job_id <<<"$JOB")"
  KIND="$(jq -r '.kind // "simulate"' <<<"$JOB")"
  echo "Claimed $KIND job $id"

  if [[ "$KIND" == "plan" ]]; then
    play_plan "$id" "$outcome"
  else
    play_simulate "$id" "$outcome"
  fi
}

play_simulate() {
  local id="$1" outcome="$2"
  redis HSET "vsr:job:$id" status running progress "preview 12/40" >/dev/null
  step "$id" "Running..." || return 0

  if [[ "$outcome" == "fail" ]]; then
    publish "$id" "$(failed_json "$id" invalid_team "the team isn't valid: a team has 6 Pokémon, this one 5")" failed
    return
  fi

  jq -c --arg id "$id" '.job_id = $id | .status = "partial"' "$FIXTURE" | redis -x SET "vsr:partial:$id" >/dev/null
  redis HSET "vsr:job:$id" partial 1 progress "search 3/10" >/dev/null
  if [[ "$outcome" == "partial" ]]; then
    hold_until_cancel "$id"
    return
  fi
  step "$id" "Published a partial result; refining..." || return 0

  publish "$id" "$(jq -c --arg id "$id" '.job_id = $id' "$FIXTURE")" complete
}

# A plan: the preview solve (then the compositions as a partial), then the search games.
play_plan() {
  local id="$1" outcome="$2"
  redis HSET "vsr:job:$id" status running progress "preview 1/1" >/dev/null
  step "$id" "Working out team preview..." || return 0

  if [[ "$outcome" == "fail" ]]; then
    publish "$id" "$(failed_json "$id" invalid_opponent "the team isn't valid: a team has 6 Pokémon, this one 4")" failed
    return
  fi

  jq -c --arg id "$id" '.job_id = $id | .status = "partial" | del(.games, .wins, .losses, .ties, .winRate, .ci95, .category)' \
    "$PLAN_FIXTURE" | redis -x SET "vsr:partial:$id" >/dev/null
  redis HSET "vsr:job:$id" partial 1 progress "search 1/1" >/dev/null
  if [[ "$outcome" == "partial" ]]; then
    hold_until_cancel "$id"
    return
  fi
  step "$id" "Published the compositions; playing the matchup..." || return 0

  publish "$id" "$(jq -c --arg id "$id" '.job_id = $id' "$PLAN_FIXTURE")" complete
}

hold_until_cancel() {
  local id="$1"
  echo "Published a partial result. Holding the job running until you press Cancel in the app..."
  until [[ "$(redis EXISTS "vsr:cancel:$id")" == "1" ]]; do sleep 2; done
  publish "$id" "$(failed_json "$id" cancelled cancelled)" failed
}

case "${1:-help}" in
  up) shift; cmd_up "$@" ;;
  down) compose down ;;
  reset) shift; cmd_reset "$@" ;;
  status) cmd_status ;;
  logs) shift; compose logs -f --tail=200 "$@" ;;
  psql) compose exec postgres psql -U vsrecorder_user -d vsrecorder_dev ;;
  redis) shift; compose exec redis redis-cli "$@" ;;
  worker) shift; cmd_worker "$@" ;;
  help | -h | --help) usage ;;
  *) usage; exit 1 ;;
esac
