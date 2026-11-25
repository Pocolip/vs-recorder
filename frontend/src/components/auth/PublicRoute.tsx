import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { redirectTarget } from "../../utils/redirect";

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const { search } = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTarget(search)} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
