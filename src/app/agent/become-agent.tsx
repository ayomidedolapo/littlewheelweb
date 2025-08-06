import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

export default function BecomeAgent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      id="become-agent"
      className="h-auto p-10 md:p-32 space-y-10 bg-black bg-[url('/uploads/ellipse.svg')] bg-contain bg-center bg-no-repeat text-white text-center"
    >
      <div className="flex flex-col items-center space-y-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Be your own boss, make money <br className="hidden md:block" />{" "}
          steady, help your community as a <br className="hidden md:block" />{" "}
          Little Wheel Agent
        </h2>
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
    </motion.div>
  );
}
