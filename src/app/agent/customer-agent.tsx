import { motion } from "framer-motion";
import Image from "next/image";
import {
  PiEyeDuotone,
  PiHandshakeDuotone,
  PiShieldCheckDuotone,
  PiWalletDuotone,
} from "react-icons/pi";

const aspectRelationship = [
  {
    icon: PiHandshakeDuotone,
    title: "Agents act as facilitators",
    description:
      "They assist customers in saving money by using their own app interface.",
  },
  {
    icon: PiShieldCheckDuotone,
    title: "Customers trust agents with their deposits",
    description:
      "Since some customers may not have smartphones, agents help them track their savings.",
  },
  {
    icon: PiWalletDuotone,
    title: "Agents earn commissions",
    description:
      "Every time an agent facilitates a savings transaction, they receive a commission as an incentive.",
  },
  {
    icon: PiEyeDuotone,
    title: "Transparency",
    description:
      "Both customers and agents receive transaction alerts to ensure trust and accountability.",
  },
];
export default function CustomerAgent() {
  return (
    <motion.div
      className="h-auto p-6 md:p-12 flex justify-center items-center"
      id="agent-knowledge"
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-[95%] space-y-8 md:space-y-12">
        <div className="space-y-4 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
            The customer-agent relationship in Little Wheel is{" "}
            <br className="hidden md:block" /> based on trust and financial
            facilitation.
          </h2>
          <p className="text-sm text-[#344054]">Here’s how it works</p>
        </div>

        <div className="h-auto grid md:grid-cols-2 gap-10">
          <div className="border-l-2 border-dashed border-[#101928] pl-4 space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Customers
            </h2>
            <p className="text-sm text-[#344054] leading-relaxed">
              These are individuals who want to save money but may not have
              smartphones or the technical skills to use the app independently.
              Instead of handling their savings directly, they rely on agents to
              assist them.
            </p>
          </div>

          <div className="border-l-2 border-dashed border-[#101928] pl-4 space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Agents
            </h2>
            <p className="text-sm text-[#344054] leading-relaxed">
              These are registered intermediaries who use the Little Wheel Agent
              App to help customers deposit money into their vaults. Agents
              collect cash from customers and process the transaction through
              the app.
            </p>
          </div>
        </div>
        <div className="w-full aspect-video relative">
          <Image
            src="/uploads/agent3.jpg"
            alt="customer-agent"
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            Key Aspects of the Relationship
          </h2>
          <div className="grid md:grid-cols-[45%_45%] gap-4 justify-around">
            {aspectRelationship.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="space-y-2">
                  <Icon size={24} />
                  <div className="space-y-2">
                    <h3 className="font-semibold leading-relaxed">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#344054] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
