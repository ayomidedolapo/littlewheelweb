import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@littlewheel/components";
import { Toaster } from "sonner";
import { cn } from "@littlewheel/lib/utils";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import ConditionalHeader from "../components/ConditionalHeader";
import ConditionalFooter from "../components/ConditionalFooter";

// ... all your font definitions remain the same ...
const inter18pt = localFont({
  src: [
    {
      path: "../fonts/inter/Inter_18pt-Black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-BlackItalic.ttf",
      weight: "900",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-ExtraBoldItalic.ttf",
      weight: "800",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-ExtraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_18pt-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_18pt-ThinItalic.ttf",
      weight: "100",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-inter-18pt",
});

const inter24pt = localFont({
  src: [
    {
      path: "../fonts/inter/Inter_24pt-Black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-BlackItalic.ttf",
      weight: "900",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-ExtraBoldItalic.ttf",
      weight: "800",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-ExtraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_24pt-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_24pt-ThinItalic.ttf",
      weight: "100",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-inter-24pt",
});

const inter28pt = localFont({
  src: [
    {
      path: "../fonts/inter/Inter_28pt-Black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-BlackItalic.ttf",
      weight: "900",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-ExtraBoldItalic.ttf",
      weight: "800",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-ExtraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/inter/Inter_28pt-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter_28pt-ThinItalic.ttf",
      weight: "100",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-inter-28pt",
});

const calSans = localFont({
  src: "../fonts/CalSans-SemiBold.otf",
  display: "swap",
  variable: "--font-calsans",
});

const instrumentSerif = localFont({
  src: [
    {
      path: "../fonts/InstrumentSerif-Regular.ttf",
      weight: "400",
      style: "regular",
    },
    {
      path: "../fonts/InstrumentSerif-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "littlewheel",
  description: "Build Financial Freedom with the Little Wheel",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        inter18pt.variable,
        inter24pt.variable,
        inter28pt.variable,
        calSans.variable,
        instrumentSerif.variable
      )}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-D8E9RJ9J4L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-D8E9RJ9J4L');
  `}
        </Script>
      </head>
      <body
        className="antialiased bg-background text-foreground min-h-screen flex flex-col"
        style={{ fontFamily: "var(--font-inter-18pt)" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange
        >
          <ConditionalHeader />

          <main className="flex-grow">
            <NextTopLoader color="#000" />
            {children}
            <Toaster richColors position="top-right" duration={1000} />
          </main>

          <ConditionalFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
