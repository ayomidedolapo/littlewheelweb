import { TbPlug } from "react-icons/tb";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import CBN from "../../../public/uploads/cbn";
import Fortress from "../../../public/uploads/fortress";
import NDIC from "../../../public/uploads/ndic";

export default function HomeScreen() {
  return (
    <div
      id="home"
      className="bg-[url('/uploads/womanmarket.png')] bg-cover bg-center h-screen text-white flex flex-col justify-center items-center relative py-16"
    >
      <div className="absolute inset-0 bg-black/40" />

      {/* Blur effect for bottom section with softer, brushed edges */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 via-black/40 to-black/5 backdrop-blur-sm" />
      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-transparent via-black/10 to-transparent opacity-60" /> */}

      {/* Main content area - centered with top and bottom spacing */}
      <div className="flex flex-col items-center text-center space-y-8 z-10 px-6 max-w-4xl mt-8 mb-20">
        <div className="px-4 py-2 w-fit bg-white bg-opacity-90 rounded-full flex items-center justify-center gap-3 text-black font-semibold">
          Be the Surest Plug
          <TbPlug size={20} />
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight uppercase tracking-wide">
            Make Money while <br />
            Helping Others Save
          </h1>
          <p className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Help customers save money and earn commissions on every transaction.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <button
            title="app unavailable"
            onClick={() =>
              toast.info(
                "iOS app is not available yet. Please check back soon!"
              )
            }
            className="focus:outline-none"
          >
            <Image
              src="/uploads/apple-store.svg"
              alt="Apple Store"
              width={160}
              height={50}
            />
          </button>

          <Link
            href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&pcampaignid=web_share"
            target="_blank"
          >
            <Image
              src="/uploads/google-store.svg"
              alt="Google Play Store"
              width={160}
              height={50}
            />
          </Link>
        </div>
      </div>

      {/* Bottom licensing section with spacing from bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-12 pt-4 px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 text-white text-sm">
          <div className="flex items-center gap-2">
            <CBN />
          </div>
          <div className="flex items-center gap-2">
            <NDIC />
          </div>
          <div className="flex items-center gap-2">
            <Fortress />
          </div>
        </div>
      </div>
    </div>
  );
}
