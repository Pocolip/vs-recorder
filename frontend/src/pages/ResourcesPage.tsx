import PageMeta from "../components/common/PageMeta";
import {
  Calculator,
  BarChart3,
  Trophy,
  CalendarDays,
  Database,
  Wrench,
  GraduationCap,
  BookOpen,
  Link2,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import resources from "../data/resources.json";

interface ResourceLink {
  label: string;
  url: string;
}

interface ResourceEntry {
  name: string;
  url: string;
  description: string;
  links?: ResourceLink[];
  note?: string;
}

interface ResourceCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  intro?: string;
  resources: ResourceEntry[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  Calculator,
  BarChart3,
  Trophy,
  CalendarDays,
  Database,
  Wrench,
  GraduationCap,
  BookOpen,
  Link2,
};

const categories = resources as ResourceCategory[];

export default function ResourcesPage() {
  return (
    <>
      <PageMeta
        title="Resources | VS Recorder"
        description="Curated VGC tools, stats, and tournament resources"
      />
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white/90">
            Resources
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Tools, stats, and community resources for VGC
          </p>
        </div>

        {categories.map((category) => {
          const Icon = ICON_MAP[category.icon] ?? Link2;
          return (
            <section key={category.id} className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white/90">
                    {category.label}
                  </h2>
                  {category.intro && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.intro}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.resources.map((resource) => (
                  <div
                    key={resource.name}
                    className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]"
                  >
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1.5 font-semibold text-gray-800 transition-colors hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
                    >
                      {resource.name}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {resource.description}
                    </p>
                    {resource.note && (
                      <p className="mt-1 text-xs italic text-gray-400 dark:text-gray-500">
                        {resource.note}
                      </p>
                    )}
                    {resource.links && resource.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {resource.links.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                          >
                            {link.label}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
