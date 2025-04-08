import DownloadVault from "./service-vaults/download-vault";
import Vault1 from "./service-vaults/vault1";
import Vault2 from "./service-vaults/vault2";
import Vault3 from "./service-vaults/vault3";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
export default function Services() {
  const [servicesRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });
  return (
    <motion.div
      id="services"
      className="h-auto p-6 md:p-12 space-y-6 my-10"
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-2xl md:text-4xl font-extrabold text-black">
          Build Financial Freedom with
          <br /> the Little Wheel
        </h1>
        <p className="text-sm md:text-base text-[#344054]">
          Unlock your financial potential with tools and services designed for
          every journey and dream.
        </p>
      </div>

      <motion.div
        ref={servicesRef}
        initial={{ opacity: 0, x: -300 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-wrap items-center justify-center gap-4"
      >
        <Vault1 />
        <Vault2 />
        <Vault3 />
      </motion.div>

      <DownloadVault />
    </motion.div>
  );
}
