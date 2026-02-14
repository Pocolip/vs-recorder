import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import TeamLayout from "./layout/TeamLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import HomePage from "./pages/Dashboard/HomePage";
import AboutPage from "./pages/AboutPage";
import ReplaysPage from "./pages/Team/ReplaysPage";
import GameByGamePage from "./pages/Team/GameByGamePage";
import MatchByMatchPage from "./pages/Team/MatchByMatchPage";
import UsageStatsPage from "./pages/Team/UsageStatsPage";
import MatchupStatsPage from "./pages/Team/MatchupStatsPage";
import MoveUsagePage from "./pages/Team/MoveUsagePage";
import MatchupPlannerPage from "./pages/Team/MatchupPlannerPage";
import PokemonNotesPage from "./pages/Team/PokemonNotesPage";
import CalculatorPage from "./pages/Team/CalculatorPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import * as pokemonService from "./services/pokemonService";

export default function App() {
  useEffect(() => {
    pokemonService.initialize();
  }, []);

  return (
    <Router>
      <ScrollToTop />
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

        {/* Protected dashboard */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/team/:teamId" element={<TeamLayout />}>
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
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
