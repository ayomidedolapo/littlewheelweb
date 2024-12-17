import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

export default function DownloadVault() {
  const [downloadRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });

  return (
    <div className="flex flex-col items-center space-y-6 px-4 md:px-8 pt-10">
      <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-black text-center leading-snug">
        Build Financial Freedom with
        <br /> the Little Wheel
      </h1>
      <p className="text-sm md:text-base text-[#344054] text-center leading-relaxed">
        Unlock your financial potential with tools and services designed for
        every journey and dream.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 w-full">
        {/* Card 1 */}
        <motion.div
          className="w-full sm:w-[45%] lg:w-[38%] bg-white border border-[#E4E7EC] shadow-sm rounded-lg p-4 space-y-4"
          ref={downloadRef}
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center space-y-4">
            <img src="/uploads/celebrate.png" alt="" className="w-8 h-8" />
            <div className="relative overflow-hidden rounded-lg w-full max-w-[276px] h-[288.5px]">
              <img
                src="uploads/phone.png"
                alt="Phone"
                className="absolute w-full h-full object-cover object-top"
              />
            </div>
          </div>
          <div className="space-y-1">
            <p>
              <strong>Personalized Account</strong>
            </p>
            <p className="text-xs md:text-sm leading-relaxed">
              Group savings allows you to invite your buddies to save together
              towards a common goal in a single account.
            </p>
            <button className="w-full md:w-2/5 flex items-center justify-center gap-2 bg-black px-4 py-3 rounded-lg text-sm text-white hover:bg-[#474747]">
              Register as a user
            </button>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div
          className="w-full sm:w-[45%] lg:w-[38%] bg-white border border-[#E4E7EC] shadow-sm rounded-lg p-4 space-y-4"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="relative overflow-hidden rounded-lg w-full max-w-[276px] h-[288.5px]">
              <img
                src="uploads/phone.png"
                alt="Phone"
                className="absolute w-full h-full object-cover object-bottom"
              />
            </div>
            <img src="/uploads/awesome.png" alt="" className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p>
              <strong>Personalized Account</strong>
            </p>
            <p className="text-xs md:text-sm leading-relaxed">
              Group savings allows you to invite your buddies to save together
              towards a common goal in a single account.
            </p>
            <button className="w-full md:w-2/5 flex items-center justify-center gap-2 bg-black px-4 py-3 rounded-lg text-sm text-white hover:bg-[#474747]">
              Register as a user
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
