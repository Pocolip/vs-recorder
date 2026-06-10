import React, { useCallback, useEffect, useState } from "react";
import { Mail, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Modal } from "../ui/modal";
import { collaboratorApi, type InvitePayload } from "../../services/api/collaboratorApi";
import {
  ALL_PERMISSIONS_FALSE,
  type Collaborator,
  type Team,
  type TeamPermissions,
} from "../../types";

interface ManageCollaboratorsModalProps {
  isOpen: boolean;
  team: Team;
  onClose: () => void;
}

const PERMISSION_LABELS: { key: keyof TeamPermissions; label: string; hint?: string }[] = [
  { key: "canAddReplays", label: "Add replays" },
  { key: "canDeleteReplays", label: "Delete replays" },
  { key: "canEditReplayNotes", label: "Edit replay & match notes" },
  { key: "canEditTeamMemberNotes", label: "Edit Pokemon notes" },
  { key: "canEditTeamMemberCalcs", label: "Edit Pokemon calcs" },
  { key: "canEditTeamDetails", label: "Edit team details" },
  { key: "canEditGamePlans", label: "Edit game plans" },
];

const DEFAULT_INVITE_PERMISSIONS: TeamPermissions = {
  canAddReplays: true,
  canDeleteReplays: false,
  canEditReplayNotes: true,
  canEditTeamMemberNotes: true,
  canEditTeamMemberCalcs: true,
  canEditTeamDetails: false,
  canEditGamePlans: true,
};

const ManageCollaboratorsModal: React.FC<ManageCollaboratorsModalProps> = ({
  isOpen,
  team,
  onClose,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerms, setInvitePerms] = useState<TeamPermissions>(DEFAULT_INVITE_PERMISSIONS);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Inline edit state — collaboratorId -> draft permissions
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<TeamPermissions>(ALL_PERMISSIONS_FALSE);
  const [savingId, setSavingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await collaboratorApi.listForTeam(team.id);
      setCollaborators(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collaborators");
    } finally {
      setLoading(false);
    }
  }, [team.id]);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setInviteEmail("");
      setInvitePerms(DEFAULT_INVITE_PERMISSIONS);
      setEditingId(null);
    }
  }, [isOpen, refresh]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSubmitting(true);
    setError(null);
    try {
      const payload: InvitePayload = { email: inviteEmail.trim(), ...invitePerms };
      await collaboratorApi.invite(team.id, payload);
      setInviteEmail("");
      setInvitePerms(DEFAULT_INVITE_PERMISSIONS);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResend = async (c: Collaborator) => {
    // Re-invite reuses the same row + permissions and sends a fresh email.
    setError(null);
    try {
      await collaboratorApi.invite(team.id, {
        email: c.inviteEmail,
        canAddReplays: c.canAddReplays,
        canDeleteReplays: c.canDeleteReplays,
        canEditReplayNotes: c.canEditReplayNotes,
        canEditTeamMemberNotes: c.canEditTeamMemberNotes,
        canEditTeamMemberCalcs: c.canEditTeamMemberCalcs,
        canEditTeamDetails: c.canEditTeamDetails,
        canEditGamePlans: c.canEditGamePlans,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    }
  };

  const handleRemove = async (c: Collaborator) => {
    if (!confirm(`Remove ${c.username ?? c.inviteEmail} from this team?`)) return;
    setError(null);
    try {
      await collaboratorApi.remove(team.id, c.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove collaborator");
    }
  };

  const startEdit = (c: Collaborator) => {
    setEditingId(c.id);
    setEditDraft({
      canAddReplays: c.canAddReplays,
      canDeleteReplays: c.canDeleteReplays,
      canEditReplayNotes: c.canEditReplayNotes,
      canEditTeamMemberNotes: c.canEditTeamMemberNotes,
      canEditTeamMemberCalcs: c.canEditTeamMemberCalcs,
      canEditTeamDetails: c.canEditTeamDetails,
      canEditGamePlans: c.canEditGamePlans,
    });
  };

  const saveEdit = async (collaboratorId: number) => {
    setSavingId(collaboratorId);
    setError(null);
    try {
      await collaboratorApi.updatePermissions(team.id, collaboratorId, editDraft);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setSavingId(null);
    }
  };

  const accepted = collaborators.filter((c) => c.status === "ACCEPTED");
  const pending = collaborators.filter((c) => c.status === "PENDING");

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 sm:p-8">
      <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
        Manage Collaborators
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Invite others to <span className="font-medium text-gray-700 dark:text-gray-300">{team.name}</span>{" "}
        and control what they can do.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Invite form */}
      <form onSubmit={handleInvite} className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Invite a collaborator</h3>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            type="submit"
            disabled={inviteSubmitting || !inviteEmail.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {inviteSubmitting ? "Sending..." : "Send invite"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {PERMISSION_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={invitePerms[key]}
                onChange={(e) => setInvitePerms((p) => ({ ...p, [key]: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              {label}
            </label>
          ))}
        </div>
      </form>

      {/* Accepted collaborators */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Active collaborators ({accepted.length})
        </h3>
        {loading ? (
          <div className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Loading...
          </div>
        ) : accepted.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No collaborators yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {accepted.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-800 dark:text-gray-100">
                      {c.username ?? c.inviteEmail}
                    </div>
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">{c.userEmail ?? c.inviteEmail}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => (editingId === c.id ? setEditingId(null) : startEdit(c))}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {editingId === c.id ? (
                        <span className="inline-flex items-center gap-1"><ChevronUp className="h-3 w-3" /> Close</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><ChevronDown className="h-3 w-3" /> Permissions</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(c)}
                      title="Remove collaborator"
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {editingId === c.id && (
                  <div className="mt-3 grid grid-cols-1 gap-1.5 rounded-lg bg-gray-50 p-3 sm:grid-cols-2 dark:bg-gray-800/50">
                    {PERMISSION_LABELS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={editDraft[key]}
                          onChange={(e) => setEditDraft((d) => ({ ...d, [key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        {label}
                      </label>
                    ))}
                    <div className="col-span-full mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => saveEdit(c.id)}
                        disabled={savingId === c.id}
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        {savingId === c.id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending invites */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Pending invites ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending invites.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {pending.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-800 dark:text-gray-100">{c.inviteEmail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Expires {new Date(c.inviteExpiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleResend(c)}
                    title="Resend invite email"
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(c)}
                    title="Revoke invite"
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default ManageCollaboratorsModal;
