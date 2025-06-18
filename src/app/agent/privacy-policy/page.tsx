"use client";
import Footer from "@littlewheel/components/footer";
import Header from "@littlewheel/components/header";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import { cn } from "@littlewheel/lib/utils";
import { useEffect, useRef, useState } from "react";

const policySections = [
  { id: "scope", title: "Scope of This Policy" },
  { id: "information", title: "Information We Collect" },
  { id: "usage", title: "How We Use Your Information" },
  { id: "third-party", title: "Third-Party Services" },
  { id: "sharing", title: "Data Sharing and Disclosure" },
  { id: "rights", title: "Your Data Rights" },
  { id: "retention", title: "Data Retention" },
  { id: "security", title: "Security Measures" },
  { id: "children", title: "Children’s Privacy" },
  { id: "updates", title: "Updates to This Policy" },
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
            <div className="grid grid-cols-1 md:grid-cols-[35%_auto] gap-8">
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
                  <p>
                    Little Wheel Tech Ltd (“Little Wheel,” “we,” “our,” or “us”)
                    is committed to protecting your privacy. This Privacy Policy
                    explains how we collect, use, disclose, and safeguard your
                    information when you use any of our platforms, including our
                    mobile applications, websites, services, or those offered
                    through our authorized agents.
                  </p>
                </p>
                <div
                  id="scope"
                  ref={(el) => {
                    sectionRefs.current.scope = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Scope of This Policy
                  </h2>
                  <p>This policy applies to three categories of users:</p>
                  <ul className="list-disc pl-8">
                    <li>Customers who use the Little Wheel Customer App</li>
                    <li>
                      Customers who do not use the app but save through a
                      registered Agent
                    </li>
                    <li>Agents who use the Little Wheel Agent App</li>
                  </ul>
                </div>

                <div
                  id="information
"
                  ref={(el) => {
                    sectionRefs.current["information"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Information We Collect
                  </h2>
                  <div className="space-y-4">
                    <p>
                      <strong>A. For App Users (Direct Customers)</strong>
                    </p>
                    <ul className="list-disc pl-8">
                      <li>Full name, phone number, date of birth</li>
                      <li>Bank Verification Number (BVN), selfie, face scan</li>
                      <li>Email address (optional)</li>
                      <li>
                        Vault details, transaction history, savings behavior
                      </li>
                      <li>IP address, device type, OS, app version</li>
                      <li>
                        Location data (for fraud prevention or personalization)
                      </li>
                    </ul>

                    <p>
                      <strong>
                        B. For Non-App Users (Agent-Onboarded Customers)
                      </strong>
                    </p>
                    <ul className="list-disc pl-8">
                      <li>Full name, phone number</li>
                      <li>Photograph during onboarding</li>
                      <li>Savings history, target vault data</li>
                      <li>Agent details, onboarding time and location</li>
                      <li>Transaction notifications via SMS</li>
                    </ul>

                    <p>
                      <strong>C. For Agents (App Users)</strong>
                    </p>
                    <ul className="list-disc pl-8">
                      <li>Full name, phone number, address, gender</li>
                      <li>
                        National ID (NIN, Voter ID), face selfie, BVN (if
                        required)
                      </li>
                      <li>Bank details for commission withdrawals</li>
                      <li>Onboarding and commission activity data</li>
                      <li>Device data and activity log</li>
                    </ul>
                  </div>
                </div>

                <div
                  id="usage
"
                  ref={(el) => {
                    sectionRefs.current["usage"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    How We Use Your Information
                  </h2>
                  <ul className="list-disc pl-8 space-y-1">
                    <li>To create and manage user accounts</li>
                    <li>
                      To facilitate transactions and manage savings/vaults
                    </li>
                    <li>To verify identities for KYC compliance</li>
                    <li>
                      To send important transaction alerts and system updates
                    </li>
                    <li>To monitor platform usage for fraud and abuse</li>
                    <li>
                      To improve product functionality and user experience
                    </li>
                    <li>To generate performance reports for agents</li>
                    <li>
                      To comply with legal obligations and regulatory
                      requirements
                    </li>
                  </ul>
                </div>

                <div
                  id="third-party
"
                  ref={(el) => {
                    sectionRefs.current["third-party"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Third-Party Services
                  </h2>
                  <p>
                    We use trusted third-party services to process and store
                    data:
                  </p>
                  <ul className="list-disc pl-8">
                    <li>
                      Biometric Verification: Smile ID, Dojah, AWS Rekognition
                    </li>
                    <li>Cloud Hosting: Firebase, Google Cloud Platform</li>
                    <li>SMS Delivery: Termii or equivalent providers</li>
                    <li>Analytics: Firebase Analytics, Mixpanel</li>
                  </ul>
                  <p>
                    These services are governed by strict agreements and do not
                    use your data for their own purposes.
                  </p>
                </div>

                <div
                  id="sharing
"
                  ref={(el) => {
                    sectionRefs.current["sharing"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Data Sharing and Disclosure
                  </h2>
                  <ul className="list-disc pl-8">
                    <li>We do not sell your data.</li>
                    <li>
                      We may share with authorized staff or agents for
                      operations.
                    </li>
                    <li>
                      With third-party services under confidentiality
                      agreements.
                    </li>
                    <li>With regulators or authorities as required by law.</li>
                    <li>
                      In case of acquisition or merger (with user notification).
                    </li>
                  </ul>
                </div>

                <div
                  id="rights
"
                  ref={(el) => {
                    sectionRefs.current["rights"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Your Data Rights
                  </h2>
                  <p>
                    <strong>Customers (App Users):</strong>
                  </p>
                  <ul className="list-disc pl-8">
                    <li>View and update data in-app</li>
                    <li>Request account deletion</li>
                    <li>Contact support for data concerns</li>
                  </ul>
                  <p>
                    <strong>Customers (Non-App Users):</strong>
                  </p>
                  <ul className="list-disc pl-8">
                    <li>Request updates/deletion via agent or support</li>
                  </ul>
                  <p>
                    <strong>Agents:</strong>
                  </p>
                  <ul className="list-disc pl-8">
                    <li>Update personal/bank info in-app</li>
                    <li>Request account deactivation and data review</li>
                  </ul>
                  <p>
                    Contact:{" "}
                    <a
                      href="mailto:support@littlewheel.app"
                      className="hover:underline hover:font-bold"
                    >
                      support@littlewheel.app
                    </a>
                  </p>
                </div>

                <div
                  id="retention
"
                  ref={(el) => {
                    sectionRefs.current["retention"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Data Retention
                  </h2>
                  <p>
                    We retain data to meet legal, regulatory, and operational
                    requirements. Personal and financial data is typically held
                    for 6 months after disengagement.
                  </p>
                </div>

                <div
                  id="security
"
                  ref={(el) => {
                    sectionRefs.current["security"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Security Measures
                  </h2>
                  <ul className="list-disc pl-8">
                    <li>End-to-end encryption</li>
                    <li>Secure authentication</li>
                    <li>Biometric withdrawal verification</li>
                    <li>Role-based access controls</li>
                  </ul>
                  <p>
                    No system is completely secure. Please report suspicious
                    activities.
                  </p>
                </div>

                <div
                  id="children
"
                  ref={(el) => {
                    sectionRefs.current["children"] = el;
                  }}
                >
                  {" "}
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Children’s Privacy
                  </h2>
                  <p>
                    We do not knowingly collect data from children under 18. If
                    discovered, such data will be deleted immediately.
                  </p>
                </div>
                <div
                  id="updates
"
                  ref={(el) => {
                    sectionRefs.current["updates"] = el;
                  }}
                >
                  {" "}
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Updates to This Policy
                  </h2>
                  <p>
                    We may update this policy. Major changes will be
                    communicated via app, push, or SMS.
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
                  <p>
                    Little Wheel Tech Ltd
                    <br />
                    Sango Garrage Terminal, Opp. Total Filling Station, Sango,
                    Ibadan
                    <br />
                    Email:{" "}
                    <a
                      href="mailto:info@littlewheel.app"
                      className="hover:underline hover:font-bold"
                    >
                      info@littlewheel.app
                    </a>
                    <br />
                    Phone:{" "}
                    <a
                      href="tel:+2347088867396"
                      className="hover:underline hover:font-bold"
                    >
                      +234 708 886 7396
                    </a>
                  </p>
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
