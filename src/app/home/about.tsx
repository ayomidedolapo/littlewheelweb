import Image from "next/image";
import { motion } from "framer-motion";

export default function About() {
  return (
    <motion.div
      id="about"
      className="h-auto bg-black text-white bg-[url('/uploads/vector1.svg')] bg-cover bg-center flex flex-col items-center px-6 sm:px-10 md:px-20 lg:px-40 py-10 md:py-20"
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex flex-col lg:flex-row justify-between space-y-10 lg:space-y-0 lg:space-x-10">
        <div className="lg:w-1/2 space-y-12">
          <div className="space-y-4">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold">
              Everyone deserves to be a baller,
              <br />
              Our mission is to make you one
            </p>
            <p className="text-sm md:text-base leading-relaxed">
              No be who hustle pass dey carry first, na who use Little Wheel.
              Your rich uncle/aunty dreams are valid. We are redefining finance
              by creating a financial ecosystem that provides you with every
              tool you need to reach your financial goals.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2">
                  <Image
                    src="/uploads/checkmark.svg"
                    alt=""
                    width={20}
                    height={20}
                    priority
                  />
                </span>
                Community Driven
              </li>
              <li className="flex items-center">
                <span className="mr-2">
                  <Image
                    src="/uploads/checkmark.svg"
                    alt=""
                    width={20}
                    height={20}
                    priority
                  />
                </span>
                Transparency
              </li>
              <li className="flex items-center">
                <span className="mr-2">
                  <Image
                    src="/uploads/checkmark.svg"
                    alt=""
                    width={20}
                    height={20}
                    priority
                  />
                </span>
                Security and Secured
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-end">
            <Image
              src="/uploads/arrow-right.svg"
              alt=""
              width={40}
              height={40}
              priority
            />
            <div className="w-[60%] md:w-[70%] transform overflow-hidden hidden md:block">
              <Image
                src="/uploads/manned-car.svg"
                alt=""
                width={500}
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>
            <div className="w-[70%] md:w-full p-1 z-10 block md:hidden">
              <Image
                src="/uploads/bicycle.svg"
                alt=""
                width={500}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        <div className="lg:w-[45%] space-y-10 md:space-y-20">
          <div className="relative flex flex-col items-start">
            <Image
              src="/uploads/arrow-left.svg"
              alt=""
              width={40}
              height={40}
              priority
            />
            <div className="w-[70%] md:w-full p-1 z-10 hidden md:block">
              <Image
                src="/uploads/bicycle.svg"
                alt=""
                width={500}
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>
            <div className="w-[60%] md:w-[70%] transform overflow-hidden block md:hidden">
              <Image
                src="/uploads/manned-car.svg"
                alt=""
                width={500}
                height={400}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>

          <p className="text-sm md:text-base leading-relaxed px-4 md:px-8">
            We redefine wealth management through Alum and Vault. For us, wealth
            means more than growing account balances—it’s about building diverse
            portfolios, making connections and having a community that has your
            back.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
