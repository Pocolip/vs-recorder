import { Helmet } from "react-helmet-async";
import LandingNav from "./LandingNav";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import AnnouncementsSection from "./AnnouncementsSection";
import LandingFooter from "./LandingFooter";

export default function LandingHome() {
  return (
    <>
      <Helmet>
        <title>VS Recorder – Pokemon VGC Replay Analysis & Team Planning</title>
        <meta
          name="description"
          content="Pokemon VGC replay analysis, team stats, matchup planning, and damage calculator."
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="VS Recorder – Pokemon VGC Replay Analysis & Team Planning"
        />
        <meta
          property="og:description"
          content="Track replays, analyze matchups, and plan for any opponent."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="VS Recorder – Pokemon VGC Replay Analysis & Team Planning"
        />
        <meta
          name="twitter:description"
          content="Track replays, analyze matchups, and plan for any opponent."
        />
      </Helmet>

      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AnnouncementsSection />
      </main>
      <LandingFooter />
    </>
  );
}
