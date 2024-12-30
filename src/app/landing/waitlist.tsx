import { useState } from "react";
import { MdMail } from "react-icons/md";
import { PiArrowRight } from "react-icons/pi";
import { cn } from "@littlewheel-landing/lib/utils";
import { toast } from "sonner";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinWaitlist = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/join-waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 409) {
        toast.error("This email is already subscribed to the waitlist.");
      } else if (response.ok) {
        toast.success("You have successfully joined the waitlist.");
        setEmail("");
      } else {
        toast.error("Something went wrong. Please try again later.");
      }
    } catch (error) {
      toast.error("Unable to process your request. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="waitlist"
      className="h-auto p-6 md:p-12 flex justify-center items-center bg-white"
    >
      <div className="bg-black w-full h-full rounded-lg overflow-hidden relative flex flex-col items-center px-6 sm:px-10 md:px-20 lg:px-40 py-10 md:py-20">
        <img
          alt=""
          src="uploads/multiCircle.png"
          className="absolute inset-0 w-4/5 md:h-auto mx-auto my-auto object-contain z-0 blur-[2px]"
        />
        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 z-10">
          Join Our Waitlist
        </h2>
        <p className="text-white text-center mb-8 max-w-md z-10">
          Unlock your financial potential with tools and services designed for
          every journey and dream.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinWaitlist();
          }}
          className="relative w-full md:w-3/5 z-10"
        >
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border-none rounded-md p-4 pl-10 text-xs md:text-sm focus:outline-none w-full"
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
              "flex items-center gap-3 rounded-md px-2 md:px-4 py-2  absolute top-1/2 right-3 transform -translate-y-1/2",
              isLoading ? "bg-gray-500" : "bg-black hover:bg-[#474747]"
            )}
          >
            <span className="text-xs md:text-sm text-white">
              {isLoading ? "Processing..." : "Join the waitlist"}
            </span>
            {!isLoading && (
              <div className="bg-white w-[20px] aspect-square flex items-center justify-center rounded-md">
                <PiArrowRight size={16} color="black" />
              </div>
            )}
          </button>
        </form>

        <img
          src="/uploads/rounded-little.svg"
          alt=""
          width={30}
          height={30}
          className="absolute top-[25%] md:top-[35%] left-[5%] transform -translate-y-1/2 z-20"
        />
        <img
          src="/uploads/rounded-little.svg"
          alt=""
          width={30}
          height={30}
          className="absolute top-[20%] md:top-[25%] right-[5%] transform -translate-y-1/2 z-20"
        />
        <img
          src="/uploads/rounded-little.svg"
          alt=""
          width={30}
          height={30}
          className="absolute -bottom-2 md:bottom-[10%] right-[10%] transform -translate-y-1/2 z-20"
        />
      </div>
    </div>
  );
}
