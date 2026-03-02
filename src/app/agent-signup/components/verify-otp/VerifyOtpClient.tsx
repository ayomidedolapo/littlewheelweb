// app/agent-signup/components/verify-otp/VerifyOtpClient.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function VerifyOtpClient() {
  const searchParams = useSearchParams();
  const otp = searchParams.get("otp");

  return (
    <div>
      <p>OTP: {otp}</p>
    </div>
  );
}