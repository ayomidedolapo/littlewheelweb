import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@littlewheel-landing/components/ui/collapsible";
import { cn } from "@littlewheel-landing/lib/utils";
import { useState } from "react";
import { PiCaretDown } from "react-icons/pi";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const faqs = [
  {
    question: "What makes your financial services different?",
    answer:
      "We provide unique, tailored services to meet your financial needs with cutting-edge technology.",
  },
  {
    question: "How do I know if I am eligible for your services?",
    answer:
      "Eligibility depends on various factors such as credit score, income level, and financial history. Contact us for a personalized assessment.",
  },
  {
    question: "Can I access my financial records online?",
    answer:
      "Yes, we provide a secure online platform where you can access your financial records anytime, anywhere.",
  },
  {
    question: "What kind of customer support do you offer?",
    answer:
      "We offer 24/7 customer support through phone, email, and live chat to ensure you receive prompt assistance.",
  },
  {
    question: "Are your financial solutions customizable?",
    answer:
      "Absolutely. We understand that every client has unique needs, and we offer customizable solutions tailored to your specific requirements.",
  },
  {
    question: "What fees do I need to be aware of?",
    answer:
      "We are transparent about all fees, which vary based on the service package chosen. Contact us for detailed fee structures.",
  },
];

export default function Faq() {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const [faqRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      id="faq"
      className="h-auto p-6 md:p-12 space-y-6 flex flex-col items-center bg-white"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl md:text-4xl font-extrabold text-black">
          Frequently Asked Questions
        </h1>
        <p className="text-sm md:text-base text-[#344054]">
          What do you think I must possess before you accept my proposal bunmi?
        </p>
      </div>
      <div className="space-y-4 md:w-1/2 w-full">
        {faqs.map((faq, index) => (
          <Collapsible
            key={index}
            open={openFaqIndex === index}
            onOpenChange={() => toggleFaq(index)}
          >
            <motion.div
              key={index}
              ref={faqRef}
              initial={{ opacity: 0, y: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <CollapsibleTrigger className="flex justify-between items-center bg-white border p-4 rounded-t-md w-full focus:outline-none">
                {/* -8 border-[#e7edf7] */}
                <span>{faq.question}</span>
                <PiCaretDown
                  size={20}
                  className={cn(
                    "transition-transform duration-200",
                    openFaqIndex === index ? "rotate-180" : ""
                  )}
                />
              </CollapsibleTrigger>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: openFaqIndex === index ? "auto" : 0 }}
                transition={{ duration: 0.3 }}
              >
                <CollapsibleContent className="bg-[#e7edf7] py-4 px-6 rounded-b-md">
                  {faq.answer}
                </CollapsibleContent>
              </motion.div>
            </motion.div>
          </Collapsible>
        ))}
      </div>
    </motion.div>
  );
}
