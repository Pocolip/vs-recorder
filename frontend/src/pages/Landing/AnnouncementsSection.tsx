import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import announcements from "../../data/announcements.json";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementsSection() {
  const latest = announcements.slice(0, 3);

  return (
    <section className="bg-gray-50 py-16 dark:bg-gray-950 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
            Latest Updates
          </h2>
        </div>

        <div className="space-y-4">
          {latest.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  {a.title}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(a.date)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {a.message}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/announcements"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View All Announcements
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
