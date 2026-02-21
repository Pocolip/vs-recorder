import { Megaphone } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import announcements from "../../data/announcements.json";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementsPage() {
  return (
    <div>
      <PageMeta
        title="VS Recorder | Announcements"
        description="Latest VS Recorder announcements and updates"
      />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mb-8 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-brand-500 dark:text-brand-400" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
            Announcements
          </h2>
        </div>

        <div className="space-y-4">
          {announcements.map((a) => (
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
      </div>
    </div>
  );
}
