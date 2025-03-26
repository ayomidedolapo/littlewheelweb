"use client";
import Footer from "@littlewheel-landing/components/footer";
import Header from "@littlewheel-landing/components/header";
import { ScrollArea } from "@littlewheel-landing/components/ui/scroll-area";
import { cn } from "@littlewheel-landing/lib/utils";
import { useEffect, useRef, useState } from "react";

const policySections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility" },
  { id: "wait-reg", title: "Waitlist Registration" },
  { id: "user-conduct", title: "User Conduct" },
  { id: "intel-right", title: "Intellectual Property Rights" },
  { id: "limit", title: "Limitation of Liability" },
  { id: "privacy", title: "Privacy Policy" },
  { id: "modification", title: "Modifications to Terms" },
  { id: "termination", title: "Termination" },
  { id: "governing", title: "Governing Law" },
  { id: "contact", title: "Contact Us" },
];
export default function Terms() {
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollToSection = (sectionId: any) => {
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
                Terms and Condition
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
                  Welcome to Little Wheel! These Terms and Conditions govern
                  your use of our website and services. By accessing or using
                  our platform, you agree to comply with these terms.
                </p>
                <div
                  id="acceptance"
                  ref={(el) => {
                    sectionRefs.current.introduction = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Acceptance of Terms
                  </h2>
                  <p>
                    By using Little Wheel’s website and services, you agree to
                    these Terms and Conditions. If you do not agree, please do
                    not use our platform.
                  </p>
                </div>

                <div
                  id="eligibility
"
                  ref={(el) => {
                    sectionRefs.current["eligibility"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Eligibility
                  </h2>
                  <p>
                    To use our services, you must be at least 18 years old or
                    the legal age in your jurisdiction. By signing up for our
                    waitlist, you confirm that you meet these eligibility
                    requirements.
                  </p>
                </div>

                <div
                  id="wait-reg
"
                  ref={(el) => {
                    sectionRefs.current["wait-reg"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Waitlist Registration
                  </h2>
                  <p>
                    To use our services, you must be at least 18 years old or
                    the legal age in your jurisdiction. By signing up for our
                    waitlist, you confirm that you meet these eligibility
                    requirements.
                  </p>
                </div>

                <div
                  id="user-conduct
"
                  ref={(el) => {
                    sectionRefs.current["user-conduct"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    User Conduct
                  </h2>
                  <p>
                    You agree not to:
                    <ul className="list-disc pl-8">
                      <li>
                        Use our platform for any illegal or unauthorized
                        purpose.
                      </li>
                      <li>
                        Attempt to hack, disrupt, or interfere with our
                        services.
                      </li>
                      <li>
                        Impersonate another person or misrepresent your
                        identity.
                      </li>
                    </ul>
                  </p>
                </div>

                <div
                  id="intel
"
                  ref={(el) => {
                    sectionRefs.current["intel"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Intellectual Property Rights
                  </h2>
                  <p>
                    All content on Little Wheel, including logos, text, and
                    graphics, is owned by or licensed to us and protected under
                    intellectual property laws. You may not copy, reproduce, or
                    distribute our content without written permission.
                  </p>
                </div>

                <div
                  id="limit
"
                  ref={(el) => {
                    sectionRefs.current["limit"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Limitation of Liability
                  </h2>
                  <p>
                    Little Wheel provides its services on an "as-is" and
                    "as-available" basis. We do not guarantee that our services
                    will be uninterrupted or error-free. To the fullest extent
                    permitted by law, we are not liable for any damages arising
                    from your use of our platform.
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
                    Privacy Policy
                  </h2>
                  <p>
                    Your use of our services is also governed by our Privacy
                    Policy, which outlines how we collect and handle your data.
                    Please review our Privacy Policy for more details.
                  </p>
                </div>

                <div
                  id="modification
"
                  ref={(el) => {
                    sectionRefs.current["modification"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Modifications to Terms
                  </h2>
                  <p>
                    We may update these Terms and Conditions from time to time.
                    If we make changes, we will notify users by updating the
                    "Last Updated" date. Your continued use of our services
                    constitutes acceptance of the revised terms.
                  </p>
                </div>

                <div
                  id="termination
"
                  ref={(el) => {
                    sectionRefs.current["termination"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Termination
                  </h2>
                  <p>
                    We reserve the right to terminate or suspend your access to
                    our platform if you violate these Terms and Conditions or
                    engage in activities that harm our services or other users.
                  </p>
                </div>

                <div
                  id="governing
"
                  ref={(el) => {
                    sectionRefs.current["governing"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Governing Law
                  </h2>
                  <p>
                    These Terms and Conditions shall be governed by and
                    interpreted in accordance with the laws of Nigeria. Any
                    disputes shall be resolved in the courts of [Insert
                    Jurisdiction].
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
                      <a href="mailto:info@littlewheel.io">
                        info@littlewheel.io
                      </a>
                      <br />
                      <a href="tel:07088867396">07088867396</a>
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
