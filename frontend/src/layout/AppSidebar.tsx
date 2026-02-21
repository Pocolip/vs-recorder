import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  Home,
  Swords,
  Pencil,
  Share2,
  Trash2,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { HorizontaLDots } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useActiveTeam } from "../context/ActiveTeamContext";
import { useFolderContext } from "../context/FolderContext";
import EditTeamModal from "../components/modals/EditTeamModal";
import ExportTeamModal from "../components/modals/ExportTeamModal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as teamService from "../services/teamService";
import type { Team, Folder } from "../types";

type SubItem = {
  name: string;
  path?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  dividerAfter?: boolean;
};

/* ── Sortable + droppable sidebar folder item ── */
function SortableFolderItem({
  folder,
  isActive,
  isVisible,
  onRename,
  onDelete,
}: {
  folder: Folder;
  isActive: boolean;
  isVisible: boolean;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `folder-${folder.id}`, data: { folderId: folder.id } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    setEditing(false);
  };

  if (editing && isVisible) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 px-2">
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-8 flex-1 min-w-0 rounded border border-brand-300 bg-transparent px-2 text-sm text-gray-800 dark:text-white/90 dark:border-brand-700 focus:outline-none"
        />
        <button onClick={handleRenameSubmit} className="p-0.5 text-emerald-500 hover:text-emerald-600">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Link
        to={`/?folder=${folder.id}`}
        className={`menu-item group ${
          isActive ? "menu-item-active" : "menu-item-inactive"
        } ${isOver ? "ring-2 ring-brand-400 ring-inset" : ""}`}
        {...attributes}
        {...listeners}
      >
        <span
          className={`menu-item-icon-size ${
            isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
          }`}
        >
          <FolderOpen className="h-5 w-5" />
        </span>
        {isVisible && (
          <span className="menu-item-text flex-1 truncate">
            {folder.name} <span className="text-xs text-gray-400 dark:text-gray-500">({folder.teamCount})</span>
          </span>
        )}
      </Link>

      {/* ⋯ menu */}
      {isVisible && (
        <div className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity z-50 ${showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} ref={menuRef}>
          <button
            onClick={(e) => { e.preventDefault(); setShowMenu((v) => !v); }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
              <button
                onClick={() => { setShowMenu(false); setEditName(folder.name); setEditing(true); }}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Rename
              </button>
              <button
                onClick={() => { setShowMenu(false); onDelete(folder.id); }}
                className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Droppable Home item ── */
function DroppableHomeItem({ isActive, isVisible }: { isActive: boolean; isVisible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "home", data: { home: true } });

  return (
    <Link
      ref={setNodeRef}
      to="/"
      className={`menu-item group ${
        isActive ? "menu-item-active" : "menu-item-inactive"
      } ${isOver ? "ring-2 ring-brand-400 ring-inset" : ""}`}
    >
      <span
        className={`menu-item-icon-size ${
          isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
        }`}
      >
        <Home className="h-5 w-5" />
      </span>
      {isVisible && <span className="menu-item-text">Home</span>}
    </Link>
  );
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const { team, setTeam, bumpStatsVersion } = useActiveTeam();
  const { folders, createFolder, renameFolder, deleteFolder } = useFolderContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New folder inline input
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef<HTMLInputElement>(null);

  // Folder delete confirmation
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  const isVisible = isExpanded || isHovered || isMobileOpen;
  const activeFolderId = searchParams.get("folder") ? Number(searchParams.get("folder")) : null;
  const isHomePage = location.pathname === "/" && !activeFolderId;
  const isDashboard = location.pathname === "/";

  useEffect(() => {
    if (creatingFolder && newFolderRef.current) newFolderRef.current.focus();
  }, [creatingFolder]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const isTeamSectionActive = useMemo(() => {
    if (!team) return false;
    return location.pathname.startsWith(`/team/${team.id}`);
  }, [team, location.pathname]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const handleTeamUpdated = (updatedTeam: Team) => {
    setTeam(updatedTeam);
    bumpStatsVersion();
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    try {
      setDeleting(true);
      await teamService.deleteTeam(team.id);
      setTeam(null);
      setShowDeleteModal(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error deleting team:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) { setCreatingFolder(false); return; }
    try {
      await createFolder(trimmed);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleRenameFolder = async (id: number, name: string) => {
    try {
      await renameFolder(id, name);
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete.id);
      // If currently viewing deleted folder, go home
      if (activeFolderId === folderToDelete.id) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
    setFolderToDelete(null);
  };

  const teamSubItems: SubItem[] = team
    ? [
        { name: "Replays", path: `/team/${team.id}/replays` },
        { name: "Game by Game", path: `/team/${team.id}/game-by-game` },
        { name: "Match by Match", path: `/team/${team.id}/match-by-match` },
        { name: "Usage Stats", path: `/team/${team.id}/usage-stats` },
        { name: "Matchup Stats", path: `/team/${team.id}/matchup-stats` },
        { name: "Move Usage", path: `/team/${team.id}/move-usage` },
        { name: "Matchup Planner", path: `/team/${team.id}/matchup-planner` },
        { name: "Pokemon Notes", path: `/team/${team.id}/pokemon-notes` },
        { name: "Calculator", path: `/team/${team.id}/calculator`, dividerAfter: true },
        { name: "Edit Team", onClick: () => setShowEditModal(true), icon: <Pencil className="h-3 w-3" /> },
        { name: "Export Team", onClick: () => setShowExportModal(true), icon: <Share2 className="h-3 w-3" /> },
        { name: "Delete Team", onClick: () => setShowDeleteModal(true), icon: <Trash2 className="h-3 w-3" /> },
      ]
    : [];

  return (
    <>
      <aside
        className={`fixed top-0 flex flex-col px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-dvh lg:h-screen overflow-y-auto transition-[width,transform] duration-300 ease-in-out z-[99999] lg:z-50 border-r border-gray-200
          ${
            isExpanded || isMobileOpen
              ? "w-[290px]"
              : isHovered
              ? "w-[290px]"
              : "w-[90px]"
          }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`py-8 flex ${
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
        >
          <Link to="/">
            {isVisible ? (
              <span className="text-xl font-bold text-gray-800 dark:text-white/90">
                VS Recorder
              </span>
            ) : (
              <span className="text-xl font-bold text-gray-800 dark:text-white/90">
                VS
              </span>
            )}
          </Link>
        </div>
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isVisible ? "Menu" : <HorizontaLDots className="size-6" />}
                </h2>

                <ul className="flex flex-col gap-4">
                  {/* Home (droppable) */}
                  <li>
                    <DroppableHomeItem isActive={isHomePage} isVisible={isVisible} />
                  </li>

                  {/* Folders section (dashboard only) */}
                  {isDashboard && folders.length > 0 && (
                    <li>
                      {isVisible && (
                        <hr className="mb-3 border-gray-200 dark:border-gray-700" />
                      )}
                      <SortableContext
                        items={folders.map((f) => `folder-${f.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ul className="flex flex-col gap-1">
                          {folders.map((folder) => (
                            <li key={folder.id}>
                              <SortableFolderItem
                                folder={folder}
                                isActive={activeFolderId === folder.id}
                                isVisible={isVisible}
                                onRename={handleRenameFolder}
                                onDelete={(id) => setFolderToDelete(folders.find((f) => f.id === id) || null)}
                              />
                            </li>
                          ))}
                        </ul>
                      </SortableContext>
                    </li>
                  )}

                  {/* New folder inline input (dashboard only) */}
                  {isDashboard && isVisible && (
                    <li>
                      {creatingFolder ? (
                        <div className="flex items-center gap-1 px-2">
                          <input
                            ref={newFolderRef}
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateFolder();
                              if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                            }}
                            onBlur={handleCreateFolder}
                            placeholder="Folder name..."
                            className="h-8 flex-1 min-w-0 rounded border border-brand-300 bg-transparent px-2 text-sm text-gray-800 dark:text-white/90 dark:border-brand-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setCreatingFolder(true)}
                          className="menu-item group menu-item-inactive w-full"
                        >
                          <span className="menu-item-icon-size menu-item-icon-inactive">
                            <Plus className="h-5 w-5" />
                          </span>
                          <span className="menu-item-text">New Folder</span>
                        </button>
                      )}
                    </li>
                  )}

                  {/* Team section divider + items */}
                  {team && (
                    <li>
                      {isVisible && (
                        <hr className="mb-3 border-gray-200 dark:border-gray-700" />
                      )}
                      <div
                        className={`menu-item group ${
                          isTeamSectionActive ? "menu-item-active" : "menu-item-inactive"
                        } ${
                          !isVisible ? "lg:justify-center" : "lg:justify-start"
                        }`}
                      >
                        <span
                          className={`menu-item-icon-size ${
                            isTeamSectionActive
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }`}
                        >
                          <Swords className="h-5 w-5" />
                        </span>
                        {isVisible && (
                          <span className="menu-item-text">{team.name}</span>
                        )}
                      </div>
                      {isVisible && (
                        <ul className="mt-2 space-y-1 ml-9">
                          {teamSubItems.map((subItem) => (
                            <li key={subItem.name}>
                              {subItem.onClick ? (
                                <button
                                  type="button"
                                  onClick={subItem.onClick}
                                  className="menu-dropdown-item menu-dropdown-item-inactive flex items-center gap-1.5 w-full text-left"
                                >
                                  {subItem.icon}
                                  {subItem.name}
                                </button>
                              ) : subItem.path ? (
                                <Link
                                  to={subItem.path}
                                  className={`menu-dropdown-item ${
                                    isActive(subItem.path)
                                      ? "menu-dropdown-item-active"
                                      : "menu-dropdown-item-inactive"
                                  }`}
                                >
                                  {subItem.name}
                                </Link>
                              ) : null}
                              {subItem.dividerAfter && (
                                <hr className="my-1.5 border-gray-200 dark:border-gray-700" />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      {team && (
        <>
          <EditTeamModal
            isOpen={showEditModal}
            team={team}
            onClose={() => setShowEditModal(false)}
            onUpdated={handleTeamUpdated}
          />
          <ExportTeamModal
            isOpen={showExportModal}
            team={team}
            onClose={() => setShowExportModal(false)}
          />
          <ConfirmationModal
            isOpen={showDeleteModal}
            title="Delete Team"
            message={
              <div>
                <p>
                  Are you sure you want to delete <strong>{team.name}</strong>?
                </p>
                <p className="mt-2">
                  This will permanently delete the team, all its replays, matches, and analysis data.
                  This action cannot be undone.
                </p>
              </div>
            }
            onConfirm={handleDeleteTeam}
            onCancel={() => setShowDeleteModal(false)}
            loading={deleting}
            confirmText="Delete Team"
            variant="danger"
          />
        </>
      )}

      {/* Folder delete confirmation */}
      <ConfirmationModal
        isOpen={!!folderToDelete}
        title="Delete Folder"
        message={
          <div>
            <p>
              Are you sure you want to delete <strong>{folderToDelete?.name}</strong>?
            </p>
            <p className="mt-2">
              Teams in this folder will not be deleted — they will just be ungrouped.
            </p>
          </div>
        }
        onConfirm={handleConfirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
        confirmText="Delete Folder"
        variant="danger"
      />
    </>
  );
};

export default AppSidebar;
