import Hero from "../components/hero";
import STEMInfo from "../components/stem-info";
import FeaturedCarousel from "../components/featured-carousel";

export default function HomePage() {
  return (
    <main className="w-full overflow-x-hidden">
      <Hero />
      <STEMInfo />
      <FeaturedCarousel />
    </main>
  );
}
