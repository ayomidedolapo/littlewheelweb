import { motion } from "framer-motion";
import Image from "next/image";

const steps = [
  {
    id: 1,
    title: "Register as an agent",
    description:
      "No be who hustle pass dey carry first, na who use Little Wheel. Your rich uncle/aunty dreams are valid. We are redefining finance",
  },
  {
    id: 2,
    title: "Recharge your Wallet",
    description:
      "No be who hustle pass dey carry first, na who use Little Wheel. Your rich uncle/aunty dreams are valid. We are redefining finance",
  },
  {
    id: 3,
    title: "Help customers save by depositing their cash into their vaults",
    description:
      "No be who hustle pass dey carry first, na who use Little Wheel. Your rich uncle/aunty dreams are valid. We are redefining finance",
  },
  {
    id: 4,
    title: "Earn commission on every transaction",
    description:
      "No be who hustle pass dey carry first, na who use Little Wheel. Your rich uncle/aunty dreams are valid. We are redefining finance",
  },
];

export default function GetStarted() {
  return (
    <motion.div
      className="h-auto p-6 md:p-12 bg-[url('/uploads/vector.jpg')] bg-contain bg-center flex justify-center items-center bg-black"
      id="get-started"
      initial={{ opacity: 0, y: -100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-[95%] grid md:grid-cols-[60%_40%] space-y-6 text-white">
        <div className="space-y-8 md:space-y-12">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Get Started in 4 steps
            </h2>
            {/* <p className="text-sm md:text-base leading-relaxed">
              No be who hustle pass dey carry first, na who use Little Wheel.
            </p> */}
          </div>

          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className="grid grid-cols-[10%_90%] gap-4 items-center"
              >
                <div className="flex items-center justify-center w-10 h-10 p-2 bg-white rounded-full text-sm text-black font-bold">
                  {step.id}
                </div>
                <div>
                  <h2 className="font-semibold">{step.title}</h2>
                  {/* <p className="text-sm leading-relaxed">{step.description}</p> */}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src="/uploads/phone.svg"
            alt="phone"
            width={400}
            height={600}
            className="max-w-full h-auto"
          />
        </div>
      </div>
    </motion.div>
  );
}
