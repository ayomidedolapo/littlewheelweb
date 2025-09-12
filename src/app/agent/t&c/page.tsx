"use client";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import { cn } from "@littlewheel/lib/utils";
import { useEffect, useRef, useState } from "react";

const policySections = [
  { id: "user-categories", title: "User Categories Covered" },
  { id: "eligibility", title: "Eligibility" },
  { id: "account-registration", title: "Account Registration" },
  { id: "use-of-services", title: "Use of Services" },
  { id: "savings-vaults", title: "Savings and Vaults" },
  { id: "withdrawals-fees", title: "Withdrawals and Admin Fees" },
  { id: "agent-commission", title: "Agent Earnings and Commission" },
  { id: "user-responsibilities", title: "User Responsibilities" },
];

export default function Terms() {
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollToSection = (sectionId: string) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
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
            <div className="flex flex-col items-center justify-center h-full text-white space-y-4 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold">
                Terms and Conditions
              </h1>
              <p className="text-lg font-bold">
                Effective Date: June 18th, 2025
              </p>
            </div>
          </section>

          <section className="min-h-[80vh] bg-[#f5f5f5] p-6 md:px-20 md:py-20 relative">
            <div className="grid grid-cols-1 md:grid-cols-[35%_auto] gap-8">
              <div className="hidden md:flex gap-4">
                <div className="h-[300px] border-l border-[#D0D5DD] transition-all duration-300" />
                <nav className="flex flex-col space-y-4">
                  {policySections.map((section) => (
                    <button
                      key={section.id}
                      className={cn(
                        "text-left pl-2 -ml-[17px] cursor-pointer",
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
                  Welcome to Little Wheel Tech Ltd (“Little Wheel,” “we,” “our,”
                  or “us”). These Terms and Conditions (“Terms”) govern your
                  access to and use of our platforms, including the Little Wheel
                  mobile applications, website, services, and interactions with
                  our authorized agents.
                </p>
                <p>
                  By using our services, you agree to comply with and be bound
                  by these Terms. If you do not agree, please do not use our
                  services.
                </p>

                <div
                  id="user-categories"
                  ref={(el) => {
                    sectionRefs.current["user-categories"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    User Categories Covered
                  </h2>
                  <p>
                    These Terms apply to: -{" "}
                    <strong>
                      Customers using the Little Wheel App - Customers onboarded
                      and managed by Agents - Agents registered on the Little
                      Wheel Agent App
                    </strong>
                  </p>
                </div>

                <div
                  id="eligibility"
                  ref={(el) => {
                    sectionRefs.current["eligibility"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Eligibility
                  </h2>
                  <p>
                    You must be at least 18 years old and have the legal
                    capacity to enter into a binding agreement. By using our
                    services, you confirm that you meet these requirements.
                  </p>
                </div>

                <div
                  id="account-registration"
                  ref={(el) => {
                    sectionRefs.current["account-registration"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Account Registration
                  </h2>
                  <div className="space-y-4">
                    <p>
                      <strong>A. App Customers:</strong>
                      <ul className="list-disc pl-8">
                        <li>
                          You must provide accurate and complete information
                          including your name, phone number, and identity
                          verification documents (e.g., BVN, face scan).
                        </li>
                        <li>
                          You are responsible for maintaining the
                          confidentiality of your login credentials.
                        </li>
                      </ul>
                    </p>
                    <p>
                      <strong>B. Agent-Onboarded Customers:</strong>
                      <ul className="list-disc pl-8">
                        <li>
                          Your account is created by a registered agent using
                          your name, phone number, and photograph.
                        </li>
                        <li>
                          You will receive SMS updates on your transactions.
                        </li>
                      </ul>
                    </p>
                    <p>
                      <strong>C. Agents:</strong>
                      <ul className="list-disc pl-8">
                        <li>
                          You must complete the onboarding process including KYC
                          verification, ID submission, and live selfie.
                        </li>
                        <li>
                          You agree to act responsibly when handling customer
                          data and transactions.
                        </li>
                      </ul>
                    </p>
                  </div>
                </div>

                <div
                  id="use-of-services"
                  ref={(el) => {
                    sectionRefs.current["use-of-services"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Use of Services
                  </h2>
                  <div className="space-y-4">
                    <p>
                      You agree to:
                      <ul className="list-disc pl-8">
                        <li>
                          Use the platform only for lawful and authorized
                          purposes.
                        </li>
                        <li>
                          Not misrepresent your identity or provide false
                          information.
                        </li>
                        <li>
                          Follow all operational guidelines provided by Little
                          Wheel.
                        </li>
                        <li>
                          Immediately report any suspicious activity or security
                          breaches.
                        </li>
                      </ul>
                    </p>
                    <p>
                      <strong>Agents additionally agree to:</strong>
                      <ul className="list-disc pl-8">
                        <li>Only onboard real, verified customers.</li>
                        <li>Accurately record all transactions.</li>
                        <li>Never retain customer funds unlawfully.</li>
                      </ul>
                    </p>
                  </div>
                </div>

                <div
                  id="savings-vaults"
                  ref={(el) => {
                    sectionRefs.current["savings-vaults"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Savings and Vaults
                  </h2>
                  <p>
                    <ul className="list-disc pl-8">
                      <li>
                        Customers can create or participate in savings vaults
                        through the app or via agents.
                      </li>
                      <li>
                        Savings are recorded and visible on the app or
                        communicated through SMS.
                      </li>
                      <li>
                        Vaults may have defined rules, durations, and withdrawal
                        terms as disclosed during setup.
                      </li>
                    </ul>
                  </p>
                </div>

                <div
                  id="withdrawals-fees"
                  ref={(el) => {
                    sectionRefs.current["withdrawals-fees"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Withdrawals and Admin Fees
                  </h2>
                  <p>
                    <ul className="list-disc pl-8">
                      <li>
                        Withdrawals are subject to authentication and applicable
                        fees based on your selected savings plan.
                      </li>
                      <li>
                        Admin fees are charged at the point of withdrawal and
                        vary by frequency (daily, weekly, monthly).
                      </li>
                      <li>
                        If a customer withdraws mid-cycle, a one-time fee
                        applies; continuation within the same cycle is
                        fee-exempt, but crossing into a new cycle attracts a new
                        fee.
                      </li>
                    </ul>
                  </p>
                </div>

                <div
                  id="agent-commission"
                  ref={(el) => {
                    sectionRefs.current["agent-commission"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    Agent Earnings and Commission
                  </h2>
                  <p>
                    <ul className="list-disc pl-8">
                      <li>
                        Agents earn commissions based on activities such as
                        onboarding customers, processing deposits, and
                        withdrawals. They also earn commission by referring
                        other agents.
                      </li>
                      <li>
                        Commissions are credited to their account and may be
                        withdrawn to a bank or converted to credit for future
                        transactions.
                      </li>
                      <li>
                        A standard platform fee may apply to commission
                        withdrawals.
                      </li>
                    </ul>
                  </p>
                </div>

                <div
                  id="user-responsibilities"
                  ref={(el) => {
                    sectionRefs.current["user-responsibilities"] = el;
                  }}
                >
                  <h2 className="text-2xl font-bold text-[#202020] mb-4">
                    User Responsibilities
                  </h2>
                  <div className="space-y-4">
                    <p>
                      You are responsible for:
                      <ul className="list-disc pl-8">
                        <li>Keeping your account details secure</li>
                        <li>
                          Ensuring your information is accurate and up-to-date
                        </li>
                        <li>Reporting errors or fraudulent activities</li>
                      </ul>
                    </p>
                    <p>
                      Little Wheel is not responsible for:
                      <ul className="list-disc pl-8">
                        <li>Losses due to shared credentials</li>
                        <li>
                          Unauthorized activities if you fail to report them
                        </li>
                      </ul>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
