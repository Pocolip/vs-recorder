import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Users, Check, X, Mail } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { collaboratorApi } from "../../services/api/collaboratorApi";
import { useAuth } from "../../context/AuthContext";
import type { InvitePreview } from "../../types";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [acceptedTeamId, setAcceptedTeamId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await collaboratorApi.previewInvite(token);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite not found");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const accepted = await collaboratorApi.acceptInvite(token);
      setDone("accepted");
      setAcceptedTeamId(accepted.teamId);
      // Auto-redirect into the team after a short moment so the user sees confirmation.
      setTimeout(() => navigate(`/team/${accepted.teamId}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await collaboratorApi.declineInvite(token);
      setDone("declined");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invite");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <PageMeta title="Invite | VS Recorder" description="Team invite" />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-brand-500 hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const isPending = preview.status === "PENDING" && !preview.expired;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <PageMeta title="Team invite | VS Recorder" description="Accept a team collaboration invite" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-brand-50 p-2 dark:bg-brand-500/20">
            <Users className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {preview.ownerUsername ? `${preview.ownerUsername} invited you` : "You've been invited"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              to collaborate on <span className="font-medium text-gray-700 dark:text-gray-300">{preview.teamName}</span>
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
          <Mail className="mr-1 inline h-3 w-3 align-text-bottom" />
          Sent to <span className="font-mono">{preview.inviteEmail}</span>
          {!preview.expired && (
            <> · expires {new Date(preview.inviteExpiresAt).toLocaleDateString()}</>
          )}
        </div>

        {preview.expired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            This invite has expired. Ask the owner to resend it.
          </div>
        )}

        {preview.status === "ACCEPTED" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            This invite has already been accepted.
          </div>
        )}

        {preview.status === "REVOKED" && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            This invite was declined or revoked.
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {done === "accepted" && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            You're in! Taking you to the team{acceptedTeamId ? "..." : ""}
          </div>
        )}
        {done === "declined" && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Invite declined.
          </div>
        )}

        {/* Action buttons */}
        {isPending && !done && (
          <div className="mt-4">
            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sign in or create an account to accept this invite. The email on the invite is{" "}
                  <span className="font-mono">{preview.inviteEmail}</span> — sign up with that address and
                  you'll be added automatically.
                </p>
                <div className="flex gap-2">
                  <Link
                    to={`/signin?redirect=/invites/${token}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    Sign in
                  </Link>
                  <Link
                    to={`/signup?redirect=/invites/${token}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {user && user.email && user.email.toLowerCase() !== preview.inviteEmail.toLowerCase() && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                    Heads up: you're signed in as <span className="font-mono">{user.email}</span>, but this
                    invite was sent to <span className="font-mono">{preview.inviteEmail}</span>. The server
                    will reject the accept unless the emails match.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={submitting}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {submitting ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
