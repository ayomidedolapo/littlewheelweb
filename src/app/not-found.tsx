/* app/not-found.tsx */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Content block */}
      <div className="mx-auto w-full max-w-[360px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+180px)] text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-5">
          <Image
            src="/uploads/Layer_x0020_1 (2).png"
            alt="Little Wheel logo"
            width={100}
            height={100}
            priority
            className="w-[72px] h-[72px] object-contain filter invert contrast-125"
          />
        </div>

        {/* Headline */}
        <h1 className="font-extrabold text-[22px] leading-[26px]">
          404 — Page not found
        </h1>
        <p className="mt-3 text-[13px] leading-[20px] text-white/90">
          The link you followed may be broken, or the page may have been moved,
          or under construction.
        </p>

        {/* Actions */}
        <div className="mt-7 grid grid-cols-1 gap-3">
          <button
            onClick={() => router.back()}
            className="w-full h-11 rounded-xl bg-white text-black font-semibold inline-flex items-center justify-center gap-2 hover:bg-white/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>

          <button
            onClick={() => router.refresh()}
            className="w-full h-11 rounded-xl bg-white/15 text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-white/20 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>

          <Link
            href="/"
            className="w-full h-11 rounded-xl bg-white text-black font-semibold inline-flex items-center justify-center hover:bg-white/90 transition"
          >
            Go to Home
          </Link>

          {/* Optional quick links */}
          <div className="mt-3 text-[12px] text-white/80">
            Prefer to start over?{" "}
            <Link href="/agent-login" className="underline underline-offset-2">
              Login
            </Link>{" "}
            ·{" "}
            <Link href="/agent-signup" className="underline underline-offset-2">
              Create account
            </Link>{" "}
            ·{" "}
            <a
              href="mailto:support@littlewheel.app"
              className="underline underline-offset-2"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
