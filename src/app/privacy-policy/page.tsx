"use client";
import Footer from "@littlewheel/components/footer";
import Header from "@littlewheel/components/header";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import { cn } from "@littlewheel/lib/utils";
import { useEffect, useRef, useState } from "react";

const policySections = [
  { id: "info", title: "Information We Collect" },
  { id: "info-use", title: "How We Use Your Information" },
  { id: "data-sharing", title: "Data Sharing and Disclosure" },
  { id: "data-security", title: "Data Security" },
  { id: "cookies-tech", title: "Cookies and Tracking Technologies" },
  { id: "privacy", title: "Your Privacy Rights" },
  { id: "update", title: "Updates to This Privacy Policy" },
  { id: "contact", title: "Contact Us" },
];
export default function PivacyPolicy() {
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollToSection = (sectionId: string) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    // Wait for refs to be populated
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0.1 }
    );

    // Register all sections with the observer
    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <div className="h-screen bg-[#F9FAFB] w-full m-0 p-0 overflow-hidden text-black">
      <Header />
      <ScrollArea className="h-[90%]">
        <div className="flex flex-col">
          <section
            className="h-[40vh] px-4 md:px-0 bg-black relative flex flex-col items-center justify-center text-white space-y-3"
            style={{
              backgroundImage: "url('/uploads/mask.svg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="flex flex-col items-center justify-center h-full text-white space-y-3 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold">
                Privacy Policy
              </h1>
              <p className="text-sm">Effective Date: Mar 9th, 2025</p>
              <p className="text-sm">Last Updated: Mar 9th, 2025</p>
            </div>
          </section>

          <section className="min-h-[80vh] bg-[#f5f5f5] p-6 md:px-20 md:py-20 relative">
            <div className="grid grid-cols-1 md:grid-cols-[35%_auto] gap-8 font-sans font-medium">
              <div className="hidden md:flex gap-4">
                <div className="h-[420px] border-l border-[#D0D5DD] transition-all duration-300" />
                <nav className="flex flex-col space-y-4">
                  {policySections.map((section) => (
                    <button
                      key={section.id}
                      className={cn(
                        "text-left  pl-2 -ml-[17px]",
                        activeSection === section.id
                          ? "text-black font-bold border-l-2 border-black pl-2"
                          : "text-[#344054]"
                      )}
                      onClick={() => scrollToSection(section.id)}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="space-y-8">
                <p>
                  Welcome to Little Wheel! Your privacy is important to us. This
                  Privacy Policy explains how we collect, use, disclose, and
                  safeguard your information when you visit our website and use
                  our services.
                </p>
                <div
                  id="info"
                  ref={(el) => {
                    sectionRefs.current.info = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Information We Collect
                  </h2>
                  <div className="space-y-4">
                    <p>
                      At this stage, we only collect the following information
                      from users:
                    </p>

                    <ul className="list-disc pl-8">
                      <li>
                        <strong>Email Address:</strong> When you join our
                        waitlist.
                      </li>
                      <li>
                        <strong>Geolocation Data:</strong> To understand where
                        our waitlist members are signing up from.
                      </li>
                    </ul>
                    <p>
                      Once we officially launch, we will update this Privacy
                      Policy to include any additional data we may collect and
                      how we use it
                    </p>
                  </div>
                </div>

                <div
                  id="info-use
"
                  ref={(el) => {
                    sectionRefs.current["info-use"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    How We Use Your Information
                  </h2>
                  <div className="space-y-4">
                    <p>
                      The information we currently collect is used solely for
                      the following purposes:
                      <ul className="list-disc pl-8">
                        <li>
                          To send email updates about the progress of our
                          product and upcoming app features.
                        </li>
                        <li>
                          To analyze geographic interest in our platform and
                          enhance our services
                        </li>
                      </ul>
                    </p>
                    <p>Your email will never be shared with third parties.</p>
                    <p>
                      Once we launch our full suite of services, this policy
                      will be updated to reflect any additional data we collect
                      and how it will be processed.
                    </p>
                  </div>
                </div>

                <div
                  id="data-sharing
"
                  ref={(el) => {
                    sectionRefs.current["data-sharing"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Data Sharing and Disclosure
                  </h2>
                  <div className="space-y-4">
                    <p>
                      We do not sell, trade, or rent users’ personal information
                      to third parties. Your data is only used for internal
                      purposes to improve our services and keep you updated.
                    </p>
                    <p>
                      However, we may disclose your information:
                      <ul className="list-disc pl-8">
                        <li>
                          To comply with legal obligations or respond to lawful
                          requests.
                        </li>
                        <li>
                          To protect and defend the rights or property of Little
                          Wheel.
                        </li>
                        <li>
                          In case of a business merger, acquisition, or asset
                          sale (users will be notified if such changes occur).
                        </li>
                      </ul>
                    </p>
                  </div>
                </div>

                <div
                  id="data-security
"
                  ref={(el) => {
                    sectionRefs.current["data-security"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Data Security
                  </h2>
                  <p>
                    We implement industry-standard security measures to
                    safeguard your information. However, no online data
                    transmission is 100% secure. While we strive to protect your
                    information, we cannot guarantee absolute security.
                  </p>
                </div>

                <div
                  id="cookies-tech
"
                  ref={(el) => {
                    sectionRefs.current["cookies-tech"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Cookies and Tracking Technologies
                  </h2>
                  <p>
                    At the moment, we do not use cookies or other tracking
                    technologies. If we introduce these in the future, this
                    policy will be updated accordingly.
                  </p>
                </div>

                <div
                  id="privacy
"
                  ref={(el) => {
                    sectionRefs.current["privacy"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Your Privacy Rights
                  </h2>
                  <div className="space-y-4">
                    <p>
                      Depending on your location, you may have the right to:
                    </p>

                    <ul className="list-disc pl-8">
                      <li>Request access to your personal data.</li>
                      <li>Request correction or deletion of your data.</li>
                      <li>Opt-out of receiving future emails.</li>
                    </ul>
                    <p>
                      To exercise these rights, contact us at{" "}
                      <a
                        href="mailto:info@littlewheel.io"
                        className="hover:underline hover:font-bold"
                      >
                        info@littlewheel.io
                      </a>
                    </p>
                  </div>
                </div>

                <div
                  id="update
"
                  ref={(el) => {
                    sectionRefs.current["update"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Updates to This Privacy Policy
                  </h2>
                  <p>
                    As our services grow, we may update this Privacy Policy.
                    When we make changes, we will update the &quot;Last
                    Updated&quot; date and notify users where applicable.
                  </p>
                </div>

                <div
                  id="contact
"
                  ref={(el) => {
                    sectionRefs.current["contact"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Contact Us
                  </h2>
                  <div className="space-y-4">
                    <p>
                      If you have any questions about this Privacy Policy,
                      please contact us at:
                    </p>
                    <p>
                      <strong>Little Wheel</strong>
                      <br />
                      2b, Ifelajulo, ologuneru, Ibadan. Nigeria
                      <br />
                      <a
                        href="mailto:info@littlewheel.io"
                        className="hover:underline hover:font-bold"
                      >
                        info@littlewheel.io
                      </a>
                      <br />
                      <a
                        href="tel:07088867396"
                        className="hover:underline hover:font-bold"
                      >
                        07088867396
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <Footer />
        </div>
      </ScrollArea>
    </div>
  );
}
