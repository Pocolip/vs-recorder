import {
  Download,
  BarChart3,
  Swords,
  Calculator,
  FolderOpen,
  Activity,
} from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Replay Import",
    description:
      "Paste a Pokemon Showdown replay link and VS Recorder automatically parses leads, picks, and results.",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "Team Analytics",
    description:
      "Track win rates, usage stats, and trends across all your replays for every team you build.",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    icon: Swords,
    title: "Matchup Planning",
    description:
      "Build game plans for tournament opponents. Plan leads, counters, and strategies for any matchup.",
    color: "text-orange-500 bg-orange-50 dark:bg-orange-500/10",
  },
  {
    icon: Calculator,
    title: "Damage Calculator",
    description:
      "Built-in damage calculator loaded with your team's sets, so you can run calcs without switching tabs.",
    color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
  },
  {
    icon: FolderOpen,
    title: "Team Organization",
    description:
      "Organize teams into folders, import from Pokepaste, and keep everything sorted by regulation.",
    color: "text-brand-500 bg-brand-50 dark:bg-brand-500/10",
  },
  {
    icon: Activity,
    title: "Move Usage Analysis",
    description:
      "See which moves each Pokemon uses most, how often they're brought, and what your leads look like.",
    color: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-16 dark:bg-gray-900 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white/90 sm:text-4xl">
            Everything you need to compete
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-gray-500 dark:text-gray-400">
            From replay tracking to opponent scouting — all in one place.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${f.color}`}
              >
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white/90">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
