import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@littlewheel-landing/components";
import { Toaster } from "sonner";
import { cn } from "@littlewheel-landing/lib/utils";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import { Inter } from "next/font/google";

// Load Google Font (Inter)
const inter = Inter({ preload: false });

// Load Local Font (Cal Sans)
const calSans = localFont({
  src: "../../public/fonts/CalSans-SemiBold.otf", // Adjust the path
  display: "swap",
  variable: "--font-calsans", // Optional for custom CSS variable
});

export const metadata: Metadata = {
  title: "littlewheel-landing",
  description: "Build Financial Freedom with the Little Wheel",
  icons: {
    icon: "/uploads/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.className} ${calSans.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      </head>
      <body
        className={cn(
          inter.className,
          "antialiased bg-background text-foreground"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange
        >
          <NextTopLoader color="#000" />
          {children}
          <Toaster richColors position="bottom-right" duration={1000} />
        </ThemeProvider>
      </body>
    </html>
  );
}
