import FeatureBoundary from "./components/common/FeatureBoundary";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/AuthPages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/AuthPages/ResetPassword"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
import TeamLayout from "./layout/TeamLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
const HomePage = lazy(() => import("./pages/Dashboard/HomePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const AnnouncementsPage = lazy(() => import("./pages/Announcements/AnnouncementsPage"));
const ReplaysPage = lazy(() => import("./pages/Team/ReplaysPage"));
const GameByGamePage = lazy(() => import("./pages/Team/GameByGamePage"));
const MatchByMatchPage = lazy(() => import("./pages/Team/MatchByMatchPage"));
const UsageStatsPage = lazy(() => import("./pages/Team/UsageStatsPage"));
const MatchupStatsPage = lazy(() => import("./pages/Team/MatchupStatsPage"));
const MoveUsagePage = lazy(() => import("./pages/Team/MoveUsagePage"));
const MatchupPlannerPage = lazy(() => import("./pages/Team/MatchupPlannerPage"));
const PokemonNotesPage = lazy(() => import("./pages/Team/PokemonNotesPage"));
const CalculatorPage = lazy(() => import("./pages/Team/CalculatorPage"));
const TypeChartPage = lazy(() => import("./pages/Team/TypeChartPage"));
const SpeedTiersPage = lazy(() => import("./pages/Team/SpeedTiersPage"));
import RootRoute from "./components/auth/RootRoute";
import PublicRoute from "./components/auth/PublicRoute";
const SharedHubPage = lazy(() => import("./pages/Collaboration/SharedHubPage"));
const AcceptInvitePage = lazy(() => import("./pages/Collaboration/AcceptInvitePage"));
import * as pokemonService from "./services/pokemonService";

export default function App() {
  useEffect(() => {
    pokemonService.initialize();
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <FeatureBoundary>
      <Suspense fallback={<div role="status" className="p-8 text-center">Loading page…</div>}>
      <Routes>
        {/* Auth (no dashboard layout) */}
        <Route
          path="/signin"
          element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Root: Landing page (unauth) or Dashboard (auth) */}
        <Route path="/" element={<RootRoute />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="shared" element={<SharedHubPage />} />
          <Route path="invites/:token" element={<AcceptInvitePage />} />
          <Route path="team/:teamId" element={<TeamLayout />}>
            <Route index element={<Navigate to="replays" replace />} />
            <Route path="replays" element={<ReplaysPage />} />
            <Route path="game-by-game" element={<GameByGamePage />} />
            <Route path="match-by-match" element={<MatchByMatchPage />} />
            <Route path="usage-stats" element={<UsageStatsPage />} />
            <Route path="matchup-stats" element={<MatchupStatsPage />} />
            <Route path="move-usage" element={<MoveUsagePage />} />
            <Route path="matchup-planner" element={<MatchupPlannerPage />} />
            <Route path="pokemon-notes" element={<PokemonNotesPage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="speed-tiers" element={<SpeedTiersPage />} />
            <Route path="type-chart" element={<TypeChartPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </FeatureBoundary>
    </Router>
  );
}
