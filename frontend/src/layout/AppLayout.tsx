import { useState } from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { ActiveTeamProvider } from "../context/ActiveTeamContext";
import { CalcStateProvider } from "../context/CalcStateContext";
import { FolderProvider, useFolderContext } from "../context/FolderContext";
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, Modifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useSearchParams } from "react-router";
import { Outlet } from "react-router";
import { teamApi } from "../services/api/teamApi";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import Footer from "../components/Footer";

/**
 * Snap the drag overlay so its center follows the pointer, regardless of
 * where on the (potentially large) source element the user initially grabbed.
 */
const snapCenterToCursor: Modifier = ({ activatorEvent, activeNodeRect, draggingNodeRect, transform }) => {
  if (activatorEvent && activeNodeRect && draggingNodeRect) {
    const { clientX, clientY } = activatorEvent as PointerEvent;
    // Offset from grab point to center of source element
    const offsetX = clientX - activeNodeRect.left - activeNodeRect.width / 2;
    const offsetY = clientY - activeNodeRect.top - activeNodeRect.height / 2;
    return {
      ...transform,
      x: transform.x + offsetX + (activeNodeRect.width - draggingNodeRect.width) / 2,
      y: transform.y + offsetY + (activeNodeRect.height - draggingNodeRect.height) / 2,
    };
  }
  return transform;
};

const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { folders, refreshFolders, bumpDataVersion, reorderFolders } = useFolderContext();
  const [searchParams] = useSearchParams();
  const activeFolderId = searchParams.get("folder") ? Number(searchParams.get("folder")) : null;

  const [dragInfo, setDragInfo] = useState<{ teamName: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.teamName) {
      setDragInfo({ teamName: data.teamName });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragInfo(null);

    const { active, over } = event;
    if (!over || !active.data.current) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Folder reorder: both active and over are folder items
    if (activeId.startsWith("folder-") && overId.startsWith("folder-") && activeId !== overId) {
      const folderIds = folders.map((f) => `folder-${f.id}`);
      const oldIndex = folderIds.indexOf(activeId);
      const newIndex = folderIds.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(folders, oldIndex, newIndex);
        await reorderFolders(reordered.map((f) => f.id));
      }
      return;
    }

    const teamId = active.data.current.teamId as number;
    const overData = over.data.current;

    if (overData?.folderId) {
      // Dropped on a folder → add to folder
      try {
        await teamApi.addToFolder(teamId, overData.folderId as number);
        await refreshFolders();
        bumpDataVersion();
      } catch (err) {
        console.error("Failed to add team to folder:", err);
      }
    } else if (overData?.home && activeFolderId) {
      // Dropped on Home while viewing a folder → remove from current folder
      try {
        await teamApi.removeFromFolder(teamId, activeFolderId);
        await refreshFolders();
        bumpDataVersion();
      } catch (err) {
        console.error("Failed to remove team from folder:", err);
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {dragInfo && (
          <div className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-lg dark:border-brand-700 dark:bg-gray-800 dark:text-white/90">
            {dragInfo.teamName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <DndWrapper>
      <div className="min-h-screen xl:flex">
        <div>
          <AppSidebar />
          <Backdrop />
        </div>
        <div
          className={`flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out ${
            isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
        >
          <AppHeader />
          <div className="flex-1 p-4 mx-auto w-full max-w-(--breakpoint-2xl) md:p-6">
            <Outlet />
          </div>
          <Footer />
        </div>
      </div>
    </DndWrapper>
  );
};

const AppLayout: React.FC = () => {
  return (
    <ActiveTeamProvider>
      <CalcStateProvider>
        <FolderProvider>
          <SidebarProvider>
            <LayoutContent />
          </SidebarProvider>
        </FolderProvider>
      </CalcStateProvider>
    </ActiveTeamProvider>
  );
};

export default AppLayout;
