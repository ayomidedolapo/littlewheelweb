"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import LogoSpinner from "../../components/loaders/LogoSpinner";

export default function OnboardPage() {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();

  const handleBack = () => {
    startTransition(() => router.back());
  };

  const handleGetStarted = () => {
    startTransition(() => {
      router.push("/onboard-form"); // absolute route as requested
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, centered card on desktop */}
      <div
        className="w-full max-w-sm bg-black min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden"
        aria-busy={isRouting}
      >
        {/* Header with Back Button */}
        <div className="px-6 pt-8 pb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg"
            disabled={isRouting}
            aria-label="Go back"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="mb-12">
            <Image
              src="/uploads/Little wheel agent onboarding 1.png"
              alt="Illustration for starting Little Wheel onboarding"
              width={280}
              height={280}
              className="w-70 h-70 object-contain"
              priority
            />
          </div>

          <h1 className="text-white text-2xl font-bold text-center mb-4 leading-tight">
            Hustle Smart With Little
          </h1>

          <p className="text-gray-300 text-center text-sm leading-relaxed mb-12 px-4">
            Every connection counts. Earn rewards by onboarding new users.
          </p>
        </div>

        {/* Bottom Section with Get Started Button */}
        <div className="px-6 pb-8 mt-auto">
          <button
            onClick={handleGetStarted}
            className="w-full bg-white text-black py-4 px-6 rounded-xl font-semibold text-sm hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            disabled={isRouting}
            aria-label="Get started with onboarding"
          >
            {isRouting ? (
              <span className="inline-flex items-center gap-2">
                <LogoSpinner show={isRouting} />
                Loading…
              </span>
            ) : (
              "Get Started"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
