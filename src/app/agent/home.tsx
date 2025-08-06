import { TbPlug } from "react-icons/tb";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function HomeScreen() {
  return (
    <div
      id="home"
      className="bg-white bg-[url('/uploads/homebg.jpg')] bg-cover bg-top h-[80vh] text-black grid grid-cols-1 md:grid-cols-[55%_45%] items-center relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white via-[#f9fafbcc] to-transparent" />
      <div className="flex flex-col md:items-start items-center space-y-5 text-center md:text-left p-6 md:p-14 z-10">
        <div className="px-4 py-2 w-fit bg-[#fbfaf9] rounded-full flex items-center justify-center gap-4 text-[#101928] font-semibold">
          Be the Surest Plug
          <TbPlug size={24} />
        </div>
        <div className="space-y-3">
          <h1 className="text-5xl font-calsans leading-tight">
            Make Money while <br className="hidden md:block" /> Helping Others
            Save
          </h1>
          <p className="text-[#101928] text-sm md:text-base leading">
            Help customers save money and earn commissions on every{" "}
            <br className="hidden md:block" />
            transaction. <br className="hidden md:block" />
          </p>
        </div>

        <div className="grid grid-cols-2 items-center gap-4">
          {/* <Link href="https://apps.apple.com/" target="_blank">
            <Image
              src="/uploads/apple-store.svg"
              alt=""
              width={200}
              height={200}
            />
          </Link> */}
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
              width={200}
              height={200}
            />
          </button>

          <Link
            href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&pcampaignid=web_share"
            target="_blank"
          >
            <Image
              src="/uploads/google-store.svg"
              alt=""
              width={200}
              height={200}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
