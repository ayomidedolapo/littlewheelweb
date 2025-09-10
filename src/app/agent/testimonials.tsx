import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@littlewheel/components/ui/avatar";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const reviews = [
  {
    id: 1,
    feedback:
      "“I have been Saving with Little Wheel for the past 2 months and they allow you to withdraw your Money anytime you choose, without any excuse or complaint.”",
    image: "/uploads/odinaka.jpg",
    name: "Odinaka",
    occupation: "Cloth Seller",
  },
  {
    id: 2,
    feedback:
      "“As an hustler, Little Wheel allows daily payment options and it also allows me to choose the amount I am comfortable paying everyday. This is very encouraging as it helps me not to overspend.”",
    image: "/uploads/ishola.jpg",
    name: "Ishola",
    occupation: "Bikeman",
  },
  {
    id: 3,
    feedback:
      "“What makes Little Wheel unique is the ability to ensure that saving is made easy at any point in time, this has encouraged me to save more”",
    image: "/uploads/saheed.jpg",
    name: "Saheed",
    occupation: "Okada Rider",
  },
  {
    id: 4,
    feedback:
      "“Little wheel didn't give me any unnecessary stress when it was time to refund my money unlike most savings companies that stress their users when payment is due.”",
    image: "/uploads/mrs-adewale.jpg",
    name: "Mrs Adewale",
    occupation: "Trader",
  },
];

export default function Testimonials() {
  const [testimonyRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });
  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="h-auto px-6 py-10 flex flex-col items-center space-y-6 bg-black"
    >
      <h2 className="text-white text-sm md:text-xl font-semibold text-center">
        Short success stories from existing agents
      </h2>

      <div className="w-full max-w-7xl md:p-6 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {reviews.map((review, id) => (
          <motion.div
            key={id}
            ref={testimonyRef}
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border border-gray-900 p-4 rounded-lg shadow-lg flex flex-col text-left space-y-4 bg-gray-900"
          >
            <p className="text-sm h-32 text-white italic">{review.feedback}</p>
            <div className="flex gap-2">
              <Avatar className="w-10 h-10 rounded-full">
                <AvatarImage src={review.image} />
                <AvatarFallback>{review.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-white">{review.name}</p>
                <p className="text-xs text-gray-500">{review.occupation}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
