import Link from "next/link";
import AppleWhiteLarge from "../../../public/uploads/apple-white-large";
import PlayStoreColored from "../../../public/uploads/play-store-colored";
import { toast } from "sonner";
// import CBN from "../../../public/uploads/cbn";
// import Fortress from "../../../public/uploads/fortress";
// import NDIC from "../../../public/uploads/ndic";
import Image from "next/image";
import { useState } from "react";
import Script from "next/script";

export default function HomeScreen() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div id="home">
      {/* ✅ Organization Schema (JSON-LD) */}
      <Script
        id="littlewheel-org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Little Wheel",
            legalName: "Little Wheel Tech Ltd",
            url: "https://littlewheel.app",
            logo: "https://littlewheel.app/logo.png",
            description:
              "Little Wheel is a fintech company that enables daily savings for commercial motorists, traders, and artisans through a secure agent-based network. Agents use the Little Wheel Agent App to digitally manage customer transactions, eliminating paper records and manual calculations.",
            sameAs: [
              "https://www.linkedin.com/company/littlewheelhq",
              "https://twitter.com/littlewheelhq",
              "https://facebook.com/littlewheelhq",
              "https://www.instagram.com/little_wheel_hq",
            ],
          }),
        }}
      />

      {/* Background section - stops at logos */}
      <div className="bg-[url('/uploads/vector.jpg')] bg-contain bg-center text-white text-center p-6 md:p-10 space-y-10 md:space-y-26">
        <div className="space-y-8">
          <div className="space-y-8 p-8">
            <h1 className="text-2xl sm:text-4xl md:text-8xl font-aeonikbold">
              SAVING SOLUTIONS BUILT FOR NIGERIA&apos;S INFORMAL SECTOR
            </h1>
            <p className="text-[#F7F9FC] text-xs md:text-2xl leading-relaxed">
              Digitizing daily contributions for traders, commercial
              transporters and artisans through agent-
              <br className="hidden md:block" />
              assisted models
            </p>
          </div>

          {/* App Store Buttons - Side by side on all screens */}
          <div className="flex justify-center items-center gap-4">
            <button
              title="Download on the App Store"
              onClick={() =>
                toast.info(
                  "iOS app is not available yet. Please check back soon!"
                )
              }
              className="cursor-pointer"
            >
              <AppleWhiteLarge size={140} />
            </button>
            <Link href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&hl=en">
              <PlayStoreColored size={150} />
            </Link>
          </div>
        </div>

        {/* Logos section - Desktop unchanged, mobile hidden */}
        {/* Desktop - original size logos (UNCHANGED) */}
        <div className=""></div>
      </div>

      {/* How the Little Wheel Agent App Works Section */}
      <div className="bg-black text-white py-8 sm:py-12 md:py-16 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-calsans mb-2 sm:mb-4 px-2">
              How the Little Wheel Agent App Works
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base px-4">
              A simple and trusted way to save anytime, anywhere.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 px-4 sm:px-6 md:px-8">
            {/* Step 1 */}
            <div className="bg-gray-900 rounded-lg sm:rounded-xl px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 lg:py-4">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center mr-3 sm:mr-4 lg:mr-3 flex-shrink-0">
                  <Image
                    src="/uploads/Emojis.png"
                    alt="Sign Up"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-md md:text-lg lg:text-base font-semibold mb-2 lg:mb-1 leading-tight">
                    Sign Up Through our Trusted Agent
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-sm leading-relaxed lg:leading-snug">
                    Customer finds a nearby Little Wheel agent and open an
                    account.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-900 rounded-lg sm:rounded-xl px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 lg:py-4">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center mr-3 sm:mr-4 lg:mr-3 flex-shrink-0">
                  <Image
                    src="/uploads/Emojis1.png"
                    alt="Make Contributions"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-md md:text-lg lg:text-base font-semibold mb-2 lg:mb-1 leading-tight">
                    Make Your Contributions
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-sm leading-relaxed lg:leading-snug">
                    Make cash or transfer contributions to the agent.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-900 rounded-lg sm:rounded-xl px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 lg:py-4">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center mr-3 sm:mr-4 lg:mr-3 flex-shrink-0">
                  <Image
                    src="/uploads/Confetti Ball.png"
                    alt="Instant Deposit"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-md md:text-lg lg:text-base font-semibold mb-2 lg:mb-1 leading-tight">
                    Instant Deposit & Tracking
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-sm leading-relaxed lg:leading-snug">
                    Agent records transactions instantly updating the
                    customer&apos;s Little Wheel account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video section - now with inline video playback */}
      <div className="p-6 pt-1 flex items-center justify-center">
        <div className="relative w-full max-w-4xl aspect-video sm:max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-lg overflow-hidden shadow-lg cursor-pointer group">
          {!showVideo ? (
            <>
              <Image
                src="/uploads/frame.png"
                alt="Little Wheel - Build Wealth Little by Little"
                width={500}
                height={500}
                className="w-full h-full object-contain"
              />

              <div
                className="absolute inset-0"
                onClick={() => setShowVideo(true)}
              />
            </>
          ) : (
            <iframe
              src="https://www.youtube.com/embed/bznC8lDH3Fs?start=17&autoplay=1&rel=0&modestbranding=1&controls=0&showinfo=0&fs=0&cc_load_policy=0&iv_load_policy=3&disablekb=1"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full h-full rounded-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}
