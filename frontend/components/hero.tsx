import Image from "next/image";
import Link from "next/link";

const logos = [
  { src: "/assets/logos/IMO.svg", alt: "IMO" },
  { src: "/assets/logos/FIRST_Robotics_Competition.png", alt: "FIRST Robotics" },
  { src: "/assets/logos/GENIUS_olympiad.png", alt: "SCI Web" },
  { src: "/assets/logos/FIRST_TECH_CHALLENGE.png", alt: "General Science" },
  { src: "/assets/logos/2021_ISEF.webp", alt: "ISEF" },
];

const Hero = () => (
  <div className="relative flex h-[520px] sm:h-[600px] md:h-[640px] lg:h-[780px] w-full items-start justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-20 sm:pt-24">
    {/* Blurred full-bleed background (lowest layer) */}
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Image
        src="/assets/images/home-hero.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover blur-2xl scale-110"
        priority={false}
      />
    </div>

    {/* Foreground background image - responsive positioning (not blurred) */}
    <Image
      src="/assets/images/home-hero.jpg"
      alt="STEM students working on robotics"
      width={1200}
      height={1200}
      className="absolute inset-0 right-0 ml-auto w-full h-full md:w-[60%] lg:w-[70%] xl:w-[920px] md:h-full lg:h-[780px] rounded-bl-[50px] lg:rounded-bl-[100px] object-cover object-center z-10"
      priority
    />

    <div className="container mx-auto relative z-20 w-full mt-16 sm:mt-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start">
        {/* Content card - responsive sizing */}
        <div className="col-span-1 lg:col-span-7 xl:col-span-6 rounded-xl border border-white bg-white/90 py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 shadow-lg shadow-black/10 backdrop-blur-sm backdrop-saturate-200 mx-auto lg:mx-0 max-w-lg lg:max-w-none">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-blue-900 leading-tight text-center lg:text-left">
            Empowering the Next Generation of STEM Leaders
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-gray-900 text-center lg:text-left">
            Discover, explore, and participate in global science and technology competitions. Science Competition Insights (SCI) connects students, educators, and innovators worldwide, providing opportunities to grow, compete, and excel in STEM fields.
          </p>

          {/* Buttons - responsive layout */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4">
            <Link href="/competitions" className="bg-gray-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold shadow hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors text-center text-sm sm:text-base">
              View all competitions
            </Link>
            <button className="border border-gray-800 text-gray-800 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold shadow hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 flex items-center justify-center gap-2 transition-colors text-sm sm:text-base">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25M12 18.75V21M4.219 4.219l1.591 1.591M18.19 18.19l1.591 1.591M3 12h2.25M18.75 12H21M4.219 19.781l1.591-1.591M18.19 5.81l1.591-1.591M8.25 12a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0z" />
              </svg>
              Get AI recommendations
            </button>
          </div>

          {/* Logos - responsive grid */}
          <div className="mt-6 sm:mt-8 grid grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-center justify-center lg:justify-start">
            {logos.map((logo) => (
              <Image
                key={logo.src}
                width={120}
                height={60}
                className="w-16 h-8 sm:w-20 sm:h-10 lg:w-24 lg:h-12 object-contain grayscale opacity-70 mx-auto"
                src={logo.src}
                alt={logo.alt}
                aria-label={logo.alt}
                tabIndex={0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Hero;
