# Contributing to VS Recorder

Thanks for your interest in helping out! VS Recorder is built for the competitive Pokemon VGC community, and contributions of any size are welcome — bug reports, feature ideas, docs fixes, sprite/data updates, and code changes.

This guide covers everything you need to get a change merged.

## Ways to Contribute

- **Open an issue** — bug reports, feature requests, questions, or ideas. No template required; just be specific enough that someone else can reproduce or understand it.
- **Open a pull request** — fix a bug, add a feature, improve docs, or clean up code. You don't need to ask first for small changes; for larger ones, opening an issue to discuss the approach first usually saves time.

You don't need to be a maintainer or have prior involvement — first-time contributors are welcome.

## Reporting Bugs

When filing a bug, please include:

- What you did (steps to reproduce)
- What you expected
- What actually happened
- Browser / OS if it's a frontend issue
- A Showdown replay URL if the bug is in replay parsing

Screenshots or short screen recordings help a lot for UI issues.

## Suggesting Features

Open an issue describing the use case. "I'm prepping for a regional and I'd like to…" is more useful than "add X" — the why helps shape the design. Tournament-relevant features (analytics, planner, calc) tend to get prioritized.

## Development Setup

See the [README](README.md#quick-start) for prerequisites and run instructions. TL;DR:

```bash
# Backend (port 8080)
cd backend && mvn spring-boot:run

# Frontend (port 3000)
cd frontend && npm install && npm start
```

The frontend dev server proxies API requests to the backend, so run both.

## Branch Naming

Branch off `develop` and use one of these prefixes:

- `feature/<short-name>` — new features (e.g. `feature/matchup-planner-mobile-toolbar`)
- `fix/<short-name>` — bug fixes (e.g. `fix/calc-level-50`)
- `chore/<short-name>` — tooling, config, version bumps, dependency updates
- `docs/<short-name>` — documentation-only changes
- `refactor/<short-name>` — code restructuring with no behavior change

Use lowercase, hyphens between words, and keep names short but descriptive.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary in imperative mood>
```

Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.

Examples from history:
- `feat: add Champions (Gen 10) support and color-code calcs`
- `fix: stack Matchup Planner toolbar below title on mobile`
- `refactor: simplify Reviewed label and update toggle in place`
- `chore: bump version to 1.0.35 [skip ci]`

Keep the summary under ~72 characters. Use the body for the *why* if it's non-obvious.

## Pull Requests

1. Fork the repo (or, if you have write access, push a branch directly).
2. Branch off `develop` using the naming convention above.
3. Make your changes, commit, and push.
4. Open a PR against `develop`. (`main` is reserved for production releases.)
5. Fill in a short description: what changed, why, and how to test it. Link related issues with `Fixes #123` if applicable.
6. Make sure CI passes — backend tests, frontend build, and Docker build all run on every PR.
7. A maintainer will review. Small changes usually merge quickly; larger ones may need a round or two of feedback.

PRs to `develop` auto-deploy to [beta.vsrecorder.app](https://beta.vsrecorder.app) once merged, so you can verify your change in a real environment before it ships to production.

### Before You Open a PR

- **Backend changes**: run `mvn test` in `backend/` and make sure it passes.
- **Frontend changes**: run `npm run build` in `frontend/` to catch type or build errors. There's no automated frontend test suite — please manually test the feature in the browser and call out edge cases in the PR description.
- **Pokemon data changes**: if you add or rename Pokemon entries, regenerate the registry (`node scripts/generate-pokemon-data.js`) and run `mvn test -Dtest=PokemonServiceTest`. See [CLAUDE.md](CLAUDE.md#pokemon-data-registry) for details.
- **Database entity changes**: keep migrations in mind — the dev DB is H2 but prod is PostgreSQL. See [backend/DATABASE.md](backend/DATABASE.md).

### Code Style

- **Backend**: standard Spring Boot conventions. Use Lombok annotations instead of boilerplate. Use MapStruct for DTO mapping. Keep services thin and testable.
- **Frontend**: functional React components with hooks. Tailwind for styling. Keep components focused; extract reusable pieces into `components/`.
- Match the surrounding code's style rather than introducing a new one in a single file.

## What Gets Merged

We try to keep things straightforward:

- Bug fixes are almost always welcome.
- New features should fit the app's focus (VGC team analysis, replay parsing, tournament prep, calc). Tangential additions may be politely declined or scoped down.
- Breaking changes to the API or data model need discussion first — open an issue.
- Cosmetic-only refactors are fine but lower priority than functional changes.

## Code of Conduct

Be kind. Assume good faith. Disagree about ideas, not people. The VGC community is small and welcoming — let's keep it that way here too.

## Questions?

Open an issue or start a discussion. If you're working on something larger and want a sanity check before committing time to it, that's exactly the kind of issue we like to see.

Thanks for contributing!
