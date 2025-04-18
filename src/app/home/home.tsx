import React, { useState } from "react";
import { cn } from "@littlewheel/lib/utils";
import { MdMail } from "react-icons/md";
import { PiArrowRight } from "react-icons/pi";
import { toast } from "sonner";
import Image from "next/image";
import { TypeAnimation } from "react-type-animation";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinWaitlist = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Wait for grecaptcha to load
      if (typeof window !== "undefined" && window.grecaptcha) {
        await new Promise<void>((resolve) =>
          window.grecaptcha.ready(() => resolve())
        );
      } else {
        toast.error("reCAPTCHA failed to load. Refresh and try again.");
        setIsLoading(false);
        return;
      }

      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (!siteKey) {
        throw new Error("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not defined");
      }

      const token = await window.grecaptcha.execute(siteKey, {
        action: "join_waitlist",
      });

      const response = await fetch("/api/join-waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.status === 400) {
        toast.error(data.error || "Invalid email format.");
      } else if (response.status === 409) {
        toast.error("This email is already subscribed to the waitlist.");
      } else if (response.status === 201) {
        toast.success("You have successfully joined the waitlist!");
        setEmail("");
      } else {
        throw new Error(data.error || "Failed to join waitlist");
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to process your request. Please try again later.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="home"
      className="bg-white bg-[url('/uploads/vector.svg')] bg-cover bg-center h-[92vh] text-black grid grid-cols-1 md:grid-cols-[55%_45%] items-center "
    >
      <div className="space-y-3 text-center md:text-left px-6 md:p-10">
        <h1 className="text-4xl font-calsans">
          Your money era needs{" "}
          <span className="font-['Instrument_Serif'] text-[40px]">
            <TypeAnimation
              sequence={[
                "a plan.",
                1000,
                "cash.",
                1000,
                "discipline.",
                1000,
                "management.",
                1000,
                "people.",
                1000,
                "a community.",
                1000,
              ]}
              speed={50}
              repeat={Infinity}
            />
          </span>
          <br /> Step into it with Little Wheel.
        </h1>
        <p className="text-[#475367] text-sm md:text-base leading">
          Less Wahala, More Wins. <br className="hidden md:block" />
          Save smarter, be your own boss and build your future.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinWaitlist();
          }}
          className="relative w-full z-10"
        >
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border border-[#E4E7EC] rounded-md p-4 pl-10 text-xs md:text-sm focus:outline-none w-full"
          />
          <MdMail
            className="absolute top-1/2 left-3 transform -translate-y-1/2"
            size={16}
            color="667185"
          />
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 md:px-4 py-2 absolute top-1/2 right-3 transform -translate-y-1/2",
              isLoading ? "bg-gray-500" : "bg-black hover:bg-[#474747]"
            )}
          >
            <span className="text-xs md:text-sm text-white hidden md:inline">
              {isLoading ? "Processing..." : "Join the waitlist"}
            </span>
            <div className="bg-white w-[20px] aspect-square flex items-center justify-center rounded-md">
              <PiArrowRight size={16} color="black" />
            </div>
          </button>
        </form>
      </div>
      <div className="h-full flex justify-center items-center">
        <Image
          src="/uploads/chain.svg"
          alt="Chain"
          width={1}
          height={1}
          className="w-[250px] md:w-[510px]"
          priority
        />
      </div>
    </div>
  );
}
