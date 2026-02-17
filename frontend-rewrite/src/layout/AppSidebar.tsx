import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Home, Swords, Pencil, Share2, Trash2 } from "lucide-react";

import { HorizontaLDots } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useActiveTeam } from "../context/ActiveTeamContext";
import EditTeamModal from "../components/modals/EditTeamModal";
import ExportTeamModal from "../components/modals/ExportTeamModal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as teamService from "../services/teamService";
import type { Team } from "../types";

type SubItem = {
  name: string;
  path?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  dividerAfter?: boolean;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const { team, setTeam, bumpStatsVersion } = useActiveTeam();
  const location = useLocation();
  const navigate = useNavigate();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        icon: <Home className="h-5 w-5" />,
        name: "Home",
        path: "/",
      },
    ];

    if (team) {
      items.push({
        icon: <Swords className="h-5 w-5" />,
        name: team.name,
        subItems: [
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
        ],
      });
    }

    return items;
  }, [team]);

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
    // Only run when pathname changes, not when isMobileOpen changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          {nav.subItems ? (
            // Team section — always expanded, no toggle
            <>
              <div
                className={`menu-item group ${
                  isTeamSectionActive ? "menu-item-active" : "menu-item-inactive"
                } ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isTeamSectionActive
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </div>
              {(isExpanded || isHovered || isMobileOpen) && (
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
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
            </>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <aside
        className={`fixed top-16 lg:top-0 flex flex-col px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-[calc(100dvh-4rem)] lg:h-screen overflow-y-auto transition-[width,transform] duration-300 ease-in-out z-[99999] lg:z-50 border-r border-gray-200
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
            {isExpanded || isHovered || isMobileOpen ? (
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
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Menu"
                  ) : (
                    <HorizontaLDots className="size-6" />
                  )}
                </h2>
                {renderMenuItems(navItems)}
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
    </>
  );
};

export default AppSidebar;
