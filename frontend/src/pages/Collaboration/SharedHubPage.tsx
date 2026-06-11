import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Users, MailX, ExternalLink, Check, X } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { collaboratorApi } from "../../services/api/collaboratorApi";
import type { Collaborator, TeamSummary } from "../../types";

export default function SharedHubPage() {
  const [pending, setPending] = useState<Collaborator[]>([]);
  const [shared, setShared] = useState<TeamSummary[]>([]);
  const [sharing, setSharing] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s, sh] = await Promise.all([
        collaboratorApi.pendingInvites(),
        collaboratorApi.sharedWithMe(),
        collaboratorApi.teamsIAmSharing(),
      ]);
      setPending(p);
      setShared(s);
      setSharing(sh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collaborations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAccept = async (invite: Collaborator) => {
    if (!invite.inviteToken) {
      setError("This invite is no longer accessible. Try opening it from the email link.");
      return;
    }
    setActionId(invite.id);
    setError(null);
    try {
      await collaboratorApi.acceptInvite(invite.inviteToken);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (invite: Collaborator) => {
    if (!invite.inviteToken) {
      setError("This invite is no longer accessible.");
      return;
    }
    setActionId(invite.id);
    setError(null);
    try {
      await collaboratorApi.declineInvite(invite.inviteToken);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invite");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <PageMeta title="Shared Teams | VS Recorder" description="Teams shared with you or that you are sharing" />

      <header className="mb-6 flex items-center gap-3">
        <Users className="h-6 w-6 text-brand-500" />
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Shared Teams</h1>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Pending invites */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">Pending invites ({pending.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No pending invites. Invites arrive by email — click the link in your inbox to accept.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-800 dark:text-gray-100">
                    {p.teamName ?? `Team #${p.teamId}`}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    Invited to {p.inviteEmail} · expires {new Date(p.inviteExpiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAccept(p)}
                    disabled={actionId === p.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(p)}
                    disabled={actionId === p.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <X className="h-3 w-3" />
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Teams shared with me */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">Teams shared with me ({shared.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : shared.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No teams are shared with you yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shared.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/team/${t.id}`}
                  className="block rounded-lg border border-gray-200 px-4 py-3 hover:border-brand-400 hover:bg-brand-50/40 dark:border-gray-700 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 dark:text-gray-100">{t.name}</span>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t.regulation || "Unknown reg"} · {t.replayCount} replay{t.replayCount === 1 ? "" : "s"} · {t.matchCount} match{t.matchCount === 1 ? "" : "es"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Teams I'm sharing */}
      <section>
        <h2 className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">Teams I'm sharing ({sharing.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : sharing.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You aren't sharing any teams yet. Open a team's "Manage Collaborators" to invite someone.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sharing.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/team/${t.id}`}
                  className="block rounded-lg border border-gray-200 px-4 py-3 hover:border-brand-400 hover:bg-brand-50/40 dark:border-gray-700 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 dark:text-gray-100">{t.name}</span>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t.regulation || "Unknown reg"} · open Manage Collaborators from the sidebar
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending.length === 0 && shared.length === 0 && sharing.length === 0 && !loading && (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <MailX className="mx-auto mb-3 h-6 w-6" />
          Nothing here yet. Once a teammate invites you (or you invite them), it'll show up on this page.
        </div>
      )}
    </div>
  );
}
