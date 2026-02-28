import { Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../layout/AppLayout";
import LandingHome from "../../pages/Landing/LandingHome";
import LandingNav from "../../pages/Landing/LandingNav";
import LandingFooter from "../../pages/Landing/LandingFooter";

const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <AppLayout />;
  }

  // Unauthenticated: landing home on "/", or public page wrapper for child routes
  if (location.pathname === "/") {
    return <LandingHome />;
  }

  return (
    <div className="flex min-h-screen flex-col dark:bg-gray-900">
      <LandingNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
};

export default RootRoute;
