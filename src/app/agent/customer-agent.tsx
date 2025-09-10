import { useState } from "react";
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

const galleryImages = [
  "/uploads/agent3.jpg",
  "/uploads/ag1.jpg",
  "/uploads/ag2.jpg",
  "/uploads/ag3.jpg",
  "/uploads/ag4.jpg",
];

export default function CustomerAgent() {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <motion.div
      className="h-auto p-6 md:p-12 flex justify-center items-center bg-black"
      id="agent-knowledge"
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-[95%] space-y-8 md:space-y-12">
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white">
            Key Aspects of the Relationship
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {aspectRelationship.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="space-y-2">
                  <Icon size={24} className="text-white" />
                  <div className="space-y-2">
                    <h3 className="font-semibold leading-relaxed text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full aspect-video relative">
          <Image
            src={galleryImages[selectedImage]}
            alt="customer-agent"
            fill
            className="object-cover rounded-2xl"
          />

          {/* Thumbnail images with transparent background */}
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-lg">
            <div className="flex gap-3">
              {galleryImages.slice(1).map((image, index) => (
                <div
                  key={index + 1}
                  className={`w-28 h-20 md:w-32 md:h-24 rounded border-2 overflow-hidden relative cursor-pointer transition-all duration-300 ${
                    selectedImage === index + 1
                      ? "border-blue-400 shadow-lg shadow-blue-400/50 scale-105"
                      : "border-white hover:border-blue-300"
                  }`}
                  onClick={() => setSelectedImage(index + 1)}
                >
                  <Image
                    src={image}
                    alt={`thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-auto grid md:grid-cols-2 gap-6">
          <div className="border-l-2 border-dashed border-white pl-4 space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Customers
            </h2>
            <p className="text-sm text-white leading-relaxed">
              These are individuals who want to save money but may not have
              smartphones or the technical skills to use the app independently.
              Instead of handling their savings directly, they rely on agents to
              assist them.
            </p>
          </div>

          <div className="border-l-2 border-dashed border-white pl-4 space-y-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Agents
            </h2>
            <p className="text-sm text-white leading-relaxed">
              These are registered intermediaries who use the Little Wheel Agent
              App to help customers deposit money into their vaults. Agents
              collect cash from customers and process the transaction through
              the app.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
