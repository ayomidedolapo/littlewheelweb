import Link from "next/link";
import AppleWhiteLarge from "../../../public/uploads/apple-white-large";
import PlayStoreColored from "../../../public/uploads/play-store-colored";
import { toast } from "sonner";
import CBN from "../../../public/uploads/cbn";
import Fortress from "../../../public/uploads/fortress";
import NDIC from "../../../public/uploads/ndic";
import Image from "next/image";

export default function HomeScreen() {
  return (
    <div id="home">
      {/* Background section - stops at logos */}
      <div className="bg-[url('/uploads/vector.jpg')] bg-contain bg-center text-white text-center p-6 md:p-10 space-y-10 md:space-y-26">
        <div className="space-y-8">
          <div className="space-y-4 p-6">
            <h1 className="text-3xl sm:text-4xl md:text-7xl font-calsans">
              SAVING SOLUTIONS BUILT FOR NIGERIA&apos;S INFORMAL SECTOR
            </h1>
            <p className="text-[#F7F9FC] text-xs md:text-base leading-relaxed">
              Digitizing daily contributions for traders, commercial
              transporters <br className="hidden md:block" />
              and artisans through agent-assisted models
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
        <div className="hidden md:flex justify-center items-center gap-2">
          <CBN /> <NDIC /> <Fortress />
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8">
            {/* Step 1 */}
            <div className="bg-gray-900 rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center mr-2 sm:mr-3 md:mr-4 flex-shrink-0">
                  {/* Replace with your image component */}
                  <Image
                    src="/uploads/Emojis.png"
                    alt="Sign Up"
                    width={24} // set a base width (px)
                    height={24} // set a base height (px)
                    className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm md:text-md lg:text-lg font-semibold mb-1 leading-tight">
                    Sign Up Through our Trusted Agent
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-xs md:text-sm leading-snug">
                    Customer finds a nearby Little Wheel agent and open an
                    account.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-900 rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center mr-2 sm:mr-3 md:mr-4 flex-shrink-0">
                  {/* Replace with your image component */}
                  <Image
                    src="/uploads/Emojis1.png"
                    alt="Make Contributions"
                    width={24} // base size, works with Tailwind classes
                    height={24}
                    className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm md:text-md lg:text-lg font-semibold mb-1 leading-tight">
                    Make Your Contributions
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-xs md:text-sm leading-snug">
                    Make cash or transfer contributions to the agent.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-900 rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center mr-2 sm:mr-3 md:mr-4 flex-shrink-0">
                  {/* Replace with your image component */}
                  <Image
                    src="/uploads/Confetti Ball.png"
                    alt="Instant Deposit"
                    width={24}
                    height={24}
                    className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm md:text-md lg:text-lg font-semibold mb-1 leading-tight">
                    Instant Deposit & Tracking
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-xs md:text-sm leading-snug">
                    Agent records transactions instantly updating the
                    customer&apos;s Little Wheel account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video section - now separate from background */}
      <div className="p-6 pt-1 md:h-[700px] h-auto flex items-center justify-center">
        <div className="relative w-full max-w-6xl aspect-square sm:w-[700px] sm:h-[700px] md:w-[900px] md:h-[900px] lg:w-[1000px] lg:h-[1000px] rounded-sm overflow-hidden shadow-lg cursor-pointer group">
          {/* Thumbnail image */}
          <Image
            src="/uploads/frame.png"
            alt="Little Wheel - Build Wealth Little by Little"
            width={500} // placeholder value, adjust based on actual image
            height={500} // placeholder value, adjust based on actual image
            className="w-full h-full object-contain"
          />

          {/* Click handler to open YouTube video */}
          <div
            className="absolute inset-0"
            onClick={() =>
              window.open(
                "https://www.youtube.com/watch?v=bznC8lDH3Fs&t=17s",
                "_blank"
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
