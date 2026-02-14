import PageMeta from "../components/common/PageMeta";
import { Users, BarChart3, Video, Swords } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Team Management",
    description:
      "Create and manage your VGC teams. Import from Pokepaste, track Showdown usernames, and organize by regulation.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Usage stats, matchup analysis, move usage breakdowns, and win rate tracking across all your replays.",
  },
  {
    icon: Video,
    title: "Replay Analysis",
    description:
      "Import Pokemon Showdown replays automatically. View game-by-game and match-by-match breakdowns.",
  },
  {
    icon: Swords,
    title: "Opponent Planning",
    description:
      "Build game plans for tournament opponents. Plan leads, counters, and strategies against specific teams.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageMeta title="About | VS Recorder" description="About VS Recorder" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white/90">
            VS Recorder
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Pokemon VGC replay analysis and team management
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white/90">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">
            Open Source
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            VS Recorder is open source. Contributions, bug reports, and feature
            requests are welcome.
          </p>
          <a
            href="https://github.com/Pocolip/vs-recorder"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white/10 dark:hover:bg-white/20"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </>
  );
}
