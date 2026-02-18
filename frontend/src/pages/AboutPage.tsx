import PageMeta from "../components/common/PageMeta";
import {
  Users,
  BarChart3,
  Video,
  Swords,
  ExternalLink,
  MessageCircle,
  Heart,
  DollarSign,
  Coins,
  Cloud,
  Shield,
} from "lucide-react";

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

        {/* Getting Started & Data & Security */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">
              Getting Started
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>1. Import your team from Pokepaste</p>
              <p>2. Add Showdown replays to start tracking</p>
              <p>3. View your analytics on the dashboard</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90">
              <Cloud className="h-5 w-5" />
              Data & Security
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                Your data is synced securely to your account
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                Access your teams from any device
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                Open source and transparent
              </div>
            </div>
          </div>
        </div>

        {/* Support & Links */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">
            Support & Links
          </h3>
          <div className="space-y-3">
            <a
              href="https://github.com/Pocolip/vs-recorder"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400"
            >
              <Shield className="h-4 w-4" />
              Report issues on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://x.com/luisfrik"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400"
            >
              <MessageCircle className="h-4 w-4" />
              Follow on Twitter/X
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://chromewebstore.google.com/detail/pokemon-showdown-replay-s/bhbnajjpbnbjdichnlbjmgiokcpemjme"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400"
            >
              <Heart className="h-4 w-4" />
              Check out my other extension for automatically saving replays
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Support Development */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90">
            <Heart className="h-5 w-5 text-pink-400" />
            Support Development
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            If VS Recorder has helped your VGC journey, consider supporting its
            development!
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]">
              <DollarSign className="h-5 w-5 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  PayPal
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  luisfrik@gmail.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]">
              <Coins className="h-5 w-5 text-orange-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Bitcoin
                </p>
                <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                  3KMwSv6KCYiKuuR9N1GoZ9RX4bvsYcwtPt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]">
              <Coins className="h-5 w-5 text-yellow-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Dogecoin
                </p>
                <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                  D6smeLTJFrv6vM7npwWWzonXtBH9r1bRjh
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
