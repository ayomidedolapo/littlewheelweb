import { Button } from "@littlewheel-landing/components/ui/button";
import { HiUserGroup } from "react-icons/hi2";
import React from "react";
import { motion } from "framer-motion";

export default function HomeScreen() {
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <motion.div
      id="home"
      className="bg-family bg-cover bg-center h-[90vh] text-white flex flex-col relative justify-end items-center"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-black/50 z-10" />
      <img
        src="uploads/rounded-little.svg"
        alt=""
        width={30}
        height={30}
        className="absolute top-[35%] left-[10%] transform -translate-y-1/2 z-20"
      />
      <div className=" h-3/5 flex flex-col items-center justify-center space-y-3 z-20">
        <React.Fragment>
          <h1 className="text-4xl md:text-7xl font-extrabold text-center">
            Build Financial Freedom
            <br />
            with the Little Wheel
          </h1>
          <p className="text-xs md:text-xl text-[#F9FAFB] text-center sm:mt-0 mt-2">
            Unlock your financial potential with tools and services designed
            <br />
            for every journey and dream.
          </p>
        </React.Fragment>
        <Button
          onClick={() => scrollToSection("waitlist")}
          className="md:flex items-center gap-2 bg-white px-4 py-5 text-black hover:bg- hover:font-bold"
        >
          <HiUserGroup size={24} />
          Join the waitlist
        </Button>
      </div>
    </motion.div>
  );
}
