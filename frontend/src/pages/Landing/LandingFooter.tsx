import { Link } from "react-router";
import { Github, ExternalLink } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <h3 className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-base font-semibold text-transparent">
              VS Recorder
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              VGC Analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to="/about"
              className="transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              About
            </Link>
            <Link
              to="/announcements"
              className="transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              Announcements
            </Link>
            <a
              href="https://github.com/Pocolip/vs-recorder"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
            <a
              href="https://x.com/luisfrik"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
            >
              Twitter/X
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Luis Medina
          </p>
        </div>
      </div>
    </footer>
  );
}
