import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@littlewheel/components/ui/collapsible";
import { cn } from "@littlewheel/lib/utils";
import { useState } from "react";
import { PiCaretDown } from "react-icons/pi";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const faqs = [
  {
    question: "What is Little Wheel, and how does it work?",
    answer:
      "Little Wheel is a software platform that helps individuals access savings, investments, and high-cost products from trusted organizations. It also helps businesses streamline payments, membership management, and customer engagement.",
  },
  {
    question: "What types of organizations can benefit from Little Wheel?",
    answer:
      "Little Wheel is for individuals looking to build wealth and organizations (businesses, nonprofits, etc.) seeking tools to manage payments, memberships, and customer engagement more effectively.",
  },
  {
    question: "How does Little Wheel help individuals build wealth?",
    answer:
      "It provides access to savings services, investment opportunities, and tools like smart installments and progress trackers to help users grow their wealth over time.",
  },
  {
    question: "WWhat tools does Little Wheel offer for organizations?",
    answer:
      "Little Wheel offers smart installments, payment links, progress trackers, and customizable tools to simplify operations, improve engagement, and grow customer or member bases.",
  },
];

export default function Faq() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
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
                <CollapsibleContent className="bg- py-4 px-6 rounded-b-md">
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
