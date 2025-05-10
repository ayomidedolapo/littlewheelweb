import { Button } from "@littlewheel/components/ui/button";
import { motion } from "framer-motion";

export default function BecomeAgent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      id="become-agent"
      className="h-auto p-10 md:p-32 space-y-10 bg-black bg-[url('/uploads/ellipse.svg')] bg-contain bg-center bg-no-repeat text-white text-center"
    >
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
        Be your own boss, make money <br className="hidden md:block" /> steady,
        help your community as a <br className="hidden md:block" /> Little Wheel
        Agent
      </h2>
      <Button className="bg-white text-black hover:bg-[#f0f2f5]">
        Become an Agent
      </Button>
    </motion.div>
  );
}
