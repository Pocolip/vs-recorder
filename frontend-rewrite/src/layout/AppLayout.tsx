import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { ActiveTeamProvider } from "../context/ActiveTeamContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import Footer from "../components/Footer";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out ${
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
  );
};

const AppLayout: React.FC = () => {
  return (
    <ActiveTeamProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </ActiveTeamProvider>
  );
};

export default AppLayout;
