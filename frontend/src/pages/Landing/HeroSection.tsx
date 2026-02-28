import { Link } from "react-router";
import GridShape from "../../components/common/GridShape";

export default function HeroSection() {
  const handleScrollToFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-brand-950 dark:bg-gray-950">
      <GridShape />
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28 lg:py-36">
        <h1 className="fade-in-up text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Level Up Your{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            VGC Game
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-300 sm:text-xl">
          Track replays, analyze matchups, and plan for any opponent.
        </p>

        <div className="fade-in-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/signup"
            className="w-full rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-600 sm:w-auto"
          >
            Get Started
          </Link>
          <a
            href="#features"
            onClick={handleScrollToFeatures}
            className="w-full rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-white/5 sm:w-auto"
          >
            See Features
          </a>
        </div>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900/50 shadow-2xl">
          <img
            src="/images/screenshots/dashboard.png"
            alt="VS Recorder Dashboard"
            className="w-full"
            onError={(e) => {
              (e.target as HTMLElement).parentElement!.style.display = "none";
            }}
          />
        </div>
      </div>
    </section>
  );
}
