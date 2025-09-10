import { motion } from "framer-motion";
import WheelIcon from "../../../public/uploads/wheel-icon";
import Image from "next/image";
import { IoMdCheckmark } from "react-icons/io";

export default function AgentKnowlege() {
  return (
    <motion.div
      className="h-auto p-6 md:p-12 flex justify-center items-center bg-black text-white"
      id="agent-knowledge"
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-[85%] space-y-8 md:space-y-12">
        <div className="grid md:grid-cols-2 items-center md:gap-4 space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Who can be an Agent?
            </h2>

            {[
              "POS Operator",
              "Shop owners and small business owners",
              "People looking for extra income",
              "Community leaders",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="text-white">
                  <WheelIcon />
                </div>
                <span className="text-sm leading-relaxed text-white">
                  {item}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full h-full flex items-center justify-center">
            <Image
              src="/uploads/agent1.svg"
              alt="phone"
              width={520}
              height={420}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 items-center md:gap-20 space-y-6">
          <div className="w-full h-full flex items-center justify-center">
            <Image
              src="/uploads/agent2.svg"
              alt="phone"
              width={520}
              height={420}
            />
          </div>
          <div className="space-y-4 ">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Smart Move. Sharp <br className="hidden md:block" /> Hustle. Win
              Big.
            </h2>
            {[
              "Earn commissions on every savings transaction",
              "Get access to financial growth opportunities and tools.",
              "Easy-to-use mobile app with real-time tracking.",
            ].map((item, index) => (
              <div key={index} className="flex md:items-center gap-4">
                <IoMdCheckmark className="text-white" />
                <span className="text-sm leading-relaxed text-white">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
