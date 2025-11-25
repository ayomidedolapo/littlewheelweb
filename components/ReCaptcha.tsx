// components/ReCaptcha.tsx
"use client";

import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

type Props = {
  onChange: (token: string | null) => void;
};

export function ReCaptcha({ onChange }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ReCAPTCHA
        sitekey={siteKey}
        onChange={(token) => {
          setError(null);
          onChange(token);
        }}
        onExpired={() => {
          setError("Verification expired, please try again.");
          onChange(null);
        }}
        onErrored={() => {
          setError("Unable to load reCAPTCHA. Please retry.");
        }}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
