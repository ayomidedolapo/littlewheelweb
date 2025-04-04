import { useState } from "react";
import { MdMail } from "react-icons/md";
import { PiArrowRight } from "react-icons/pi";
import { cn } from "@littlewheel/lib/utils";
import { toast } from "sonner";

// export declare const grecaptcha: {
//   execute(siteKey: string, options: { action: string }): Promise<string>;
// };
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
      id="waitlist"
      className="h-auto p-6 md:p-12 flex justify-center items-center bg-white"
    >
      <div
        className="bg-black w-full h-full rounded-lg overflow-hidden relative flex flex-col items-center px-6 sm:px-10 md:px-20 lg:px-40 py-10 md:py-40"
        style={{
          backgroundImage: "url('/uploads/ellipse.svg')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 z-10">
          Want to be the next (Mr/Ms) Money?
        </h2>
        <p className="text-white text-center mb-8 z-10">
          Hop on the Wheel and join the waitlist. Let’s spin you into your money
          era!
          <br className="hidden md:block" /> Prepare to cash in, because this
          ride’s about to pay off
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
