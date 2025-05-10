import React, { useState } from "react";
import { cn } from "@littlewheel/lib/utils";
import { MdMail } from "react-icons/md";
import { PiArrowRight } from "react-icons/pi";
import { toast } from "sonner";

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
      className="bg-white bg-[url('/uploads/homebg.jpg')] bg-cover bg-top h-[80vh] text-black grid grid-cols-1 md:grid-cols-[55%_45%] items-center relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white via-[#f9fafbcc] to-transparent" />
      <div className="space-y-3 text-center md:text-left px-6 md:p-10 z-10">
        <h1 className="text-4xl font-calsans">
          Make Money while <br className="hidden md:block" /> Helping Others
          Save
        </h1>
        <p className="text-[#101928] text-sm md:text-base leading">
          Help customers save money and earn commissions on every{" "}
          <br className="hidden md:block" />
          transaction. <br className="hidden md:block" />
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
    </div>
  );
}
