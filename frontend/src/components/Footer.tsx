import { Link } from "react-router";
import { Github, Info, Megaphone } from "lucide-react";

export default function Footer() {
  const version = import.meta.env.VITE_APP_VERSION ?? "dev";

  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-(--breakpoint-2xl) px-4 py-6 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-base font-semibold text-transparent">
                VS Recorder
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                VGC Analytics
              </p>
            </div>
            <a
              href="https://github.com/Pocolip/vs-recorder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              title="GitHub Repository"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>

          {/* Footer links */}
          <div className="flex items-center gap-1">
            <Link
              to="/about"
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <Info className="h-3 w-3" />
              About
            </Link>
            <Link
              to="/announcements"
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <Megaphone className="h-3 w-3" />
              Announcements
            </Link>
          </div>

          {/* Version / Copyright */}
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              &copy; {new Date().getFullYear()} Luis Medina
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-600">
              v{version}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
