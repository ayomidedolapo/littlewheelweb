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

      {/* Main content area */}
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

      {/* Bottom licensing section (hidden on mobile) */}
      <div
        className="hidden md:block absolute inset-x-0 bottom-0 z-10 px-4 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 1rem)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div
            className="
              grid grid-cols-3
              items-center justify-items-center
              gap-x-8 gap-y-4
              text-white text-xs
            "
          >
            {/* CBN */}
            <div className="flex items-center justify-center">
              <div className="hidden md:block lg:hidden">
                <CBN size={112} />
              </div>
              <div className="hidden lg:block">
                <CBN size={144} />
              </div>
            </div>

            {/* NDIC */}
            <div className="flex items-center justify-center">
              <div className="hidden md:block lg:hidden">
                <NDIC size={150} />
              </div>
              <div className="hidden lg:block">
                <NDIC size={180} />
              </div>
            </div>

            {/* Fortress */}
            <div className="flex items-center justify-center">
              <div className="hidden md:block lg:hidden">
                <Fortress size={128} />
              </div>
              <div className="hidden lg:block">
                <Fortress size={160} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
