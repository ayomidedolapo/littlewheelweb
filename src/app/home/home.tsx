import Link from "next/link";
import AppleWhiteLarge from "../../../public/uploads/apple-white-large";
import PlayStoreColored from "../../../public/uploads/play-store-colored";
import { toast } from "sonner";
import CBN from "../../../public/uploads/cbn";
import Fortress from "../../../public/uploads/fortress";
import NDIC from "../../../public/uploads/ndic";

export default function HomeScreen() {
  return (
    <div
      id="home"
      className="bg-black bg-[url('/uploads/vector.svg')] bg-cover bg-center text-white text-center p-6 md:p-10 space-y-10 md:space-y-26"
    >
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-7xl font-calsans">
            SAVING SOLUTIONS BUILT FOR NIGERIA&apos;S INFORMAL SECTOR
          </h1>
          <p className="text-[#F7F9FC] text-sm md:text-base leading-relaxed">
            Digitizing daily contributions for traders, commercial transporters{" "}
            <br className="hidden md:block" />
            and artisans through agent-assisted models
          </p>
        </div>

        <div className="hidden md:flex justify-center items-center gap-4">
          {/* <Link href="/">
            <AppleWhiteLarge />
          </Link> */}
          <button
            title="Download on the App Store"
            onClick={() =>
              toast.info(
                "iOS app is not available yet. Please check back soon!"
              )
            }
            className="cursor-pointer"
          >
            <AppleWhiteLarge />
          </button>
          <Link href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&hl=en">
            <PlayStoreColored />
          </Link>
        </div>

        <div className="md:hidden flex justify-center items-center gap-4">
          {/* <Link href="/">
            <AppleWhiteLarge />
          </Link> */}
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

      <div className="hidden md:flex justify-center items-center gap-2">
        <CBN />
        <NDIC />
        <Fortress />
      </div>
      <div className="md:hidden flex items-center justify-between">
        <CBN size={100} />
        <NDIC size={100} />
        <Fortress size={100} />
      </div>

      <div className="p-6 md:h-[500px] h-auto">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/bznC8lDH3Fs?start=17"
          title="Little Wheel - Build Wealth Little by Little"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
