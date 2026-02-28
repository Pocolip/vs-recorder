import { Link } from "react-router";
import { ThemeToggleButton } from "../../components/common/ThemeToggleButton";

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-lg font-bold text-transparent">
          VS Recorder
        </span>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggleButton />
          <Link
            to="/signin"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
