import { motion } from "framer-motion";
import Image from "next/image";
import { useInView } from "react-intersection-observer";

export default function DownloadVault() {
  const [downloadRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });

  return (
    <div className="flex flex-col items-center space-y-6 px-4 md:px-8 pt-10">
      <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-black text-center leading-snug">
        Your goals are your Reality, save up and{" "}
        <br className="hidden md:block" /> achieve them with ease
      </h1>
      <p className="text-sm md:text-base text-[#344054] text-center leading-relaxed">
        Our Services are accessible to all.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 w-full">
        {/* Card 1 */}
        <motion.div
          className="w-full sm:w-[45%] lg:w-[38%] bg-white border border-[#E4E7EC] shadow-sm rounded-lg space-y-4"
          ref={downloadRef}
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center space-y-4 bg-black px-4 pt-4 rounded-t-lg">
            <Image
              src="/uploads/celebrate.png"
              alt="Celebration icon"
              width={32}
              height={32}
              className="w-8 h-8"
              priority
            />

            <div className="relative overflow-hidden rounded-lg w-full max-w-[276px] h-[288.5px]">
              <Image
                src="/uploads/phone2.png"
                alt="Phone"
                width={276}
                height={289}
                className="absolute w-full h-full object-cover object-top"
                priority
              />
            </div>
          </div>
          <div className="space-y-1 p-4">
            <p>
              <strong>Digitally-Savvy Users</strong>
            </p>
            <p className="text-xs md:text-sm leading-relaxed">
              These include Gen Zs, Millenials, and professionals who earn on a
              monthly/daily basis and interact with digital platforms regularly.
            </p>
            <button className="w-full md:w-2/5 flex items-center justify-center gap-2 bg-black px-4 py-3 rounded-lg text-sm text-white hover:bg-[#474747]">
              Register as a user
            </button>
          </div>
        </motion.div>

        <motion.div
          className="w-full sm:w-[45%] lg:w-[38%] bg-white border border-[#E4E7EC] shadow-sm rounded-lg space-y-4"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center space-y-4 bg-black px-4 pb-4 rounded-t-lg">
            <div className="relative overflow-hidden rounded-lg w-full max-w-[276px] h-[288.5px]">
              <Image
                src="/uploads/phone.png"
                alt="Phone"
                width={276}
                height={289}
                className="absolute w-full h-full object-cover object-bottom"
                priority
              />
            </div>
            <Image
              src="/uploads/awesome.png"
              alt="Awesome icon"
              width={32}
              height={32}
              className="w-8 h-8"
              priority
            />
          </div>
          <div className="space-y-1 p-4">
            <p>
              <strong>Organizations and Groups</strong>
            </p>
            <p className="text-xs md:text-sm leading-relaxed">
              These include charities, educational institutions, associations,
              clubs, religious organizations, businesses, and cooperative
              societies.
            </p>
            <button className="w-full md:w-1/2 flex items-center justify-center gap-2 bg-black px-4 py-3 rounded-lg text-sm text-white hover:bg-[#474747]">
              Join as an Organization
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
