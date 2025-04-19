"use client";
import { Separator } from "@littlewheel/components/ui/separator";
import {
  FaLinkedin,
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  { id: 1, name: "Home", to: "home", type: "section" },
  { id: 2, name: "About Us", to: "about", type: "section" },
  { id: 3, name: "Our Services", to: "services", type: "section" },
  { id: 4, name: "FAQ", to: "faq", type: "section" },
  { id: 5, name: "Blog", to: "/blog", type: "link" },
];

const legalLinks = [
  { name: "Terms and Condition", href: "/t&c" },
  { name: "Privacy Policy", href: "/privacy-policy" },
];

const contactDetails = [
  { type: "Phone", value: "+234 708 886 7396" },
  { type: "Phone", value: "+234 803 964 0092" },
  { type: "Email", value: "info@littlewheel.app" },
];

const socialLinks = [
  {
    icon: FaInstagram,
    href: "https://www.instagram.com/littlewheelhq/",
    label: "Instagram",
  },
  {
    icon: FaFacebook,
    href: "https://web.facebook.com/littlewheelhq/",
    label: "Facebook",
  },
  { icon: FaXTwitter, href: "https://x.com/littlewheelhq", label: "X" },
  {
    icon: FaLinkedin,
    href: "https://www.linkedin.com/company/littlewheelhq/",
    label: "LinkedIn",
  },
  {
    icon: FaYoutube,
    href: "https://www.youtube.com/@Littlewheelhq",
    label: "LinkedIn",
  },
  {
    icon: FaTiktok,
    href: "https://www.tiktok.com/@littlewheelhq",
    label: "LinkedIn",
  },
];

export default function Footer() {
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <motion.footer
      initial={{ opacity: 0, y: -100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="p-6 md:p-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Image
            src="/uploads/logo.svg"
            alt="LitteWheel"
            width={340}
            height={90}
            className="max-w-full"
            priority
          />
          <p className="text-sm text-[#344054] px-4">
            Build Wealth Little by Little
          </p>

          <div className="p-4 hidden md:block">
            <p className="text-sm text-[#344054] mt-4">Follow us on:</p>
            <div className="flex space-x-4 mt-2">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white p-1.5 rounded-full hover:bg-[#0D5EBA]"
                >
                  <social.icon size={20} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  {link.type === "link" ? (
                    <Link
                      href={link.to}
                      className="hover:font-bold hover:underline text-sm"
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <button
                      onClick={() => scrollToSection(link.to)}
                      className="hover:font-bold hover:underline text-sm"
                    >
                      {link.name}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="hover:font-bold hover:underline text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10">
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              {contactDetails.map((contact, index) => (
                <li key={index} className="text-sm mb-2">
                  {contact.type === "Email" ? (
                    <a
                      href={`mailto:${contact.value}`}
                      className="hover:font-bold hover:underline"
                    >
                      {contact.value}
                    </a>
                  ) : (
                    <a
                      href={`tel:${contact.value}`}
                      className="hover:font-bold hover:underline"
                    >
                      {contact.value}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Separator className="my-8 bg-[#DADADA]" />

      <div className="space-y-4">
        <div className="block md:hidden">
          <div className="flex space-x-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white p-1.5 rounded-full hover:bg-[#0D5EBA]"
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>
        <div className="w-full space-y-5 text-[#344054] text-sm">
          <div className="space-y-3">
            <p>
              Little Wheel is an end-to-end software that provides individuals
              with a trusted platform to access savings services, investment
              opportunities and High-cost products from verified organizations.
              And simplifies payment collection and membership/customer
              management for organizations and businesses.
            </p>
            <p>
              Our platform offers smart installments, payment links, progress
              trackers, and customizable tools tailored to different
              organization types. With these resources, organizations can
              streamline operations, improve engagement, and reach more
              potential customers and/or members. And individuals, on the other
              hand, can build wealth little by little.
            </p>
            <p>
              While we process our involvement in the CBN&apos;s Regulatory
              Sandbox, we currently operate with both a lender licence and a
              cooperative licence. Read our legal documents to understand more
              about us
            </p>
          </div>
          <div className="space-y-1">
            <p>Nigeria: Sango Terminal, Sango, Ibadan, Nigeria. 07088867396</p>
            <p>
              United Kingdom: 14/2E Docklands Business Centre 10-16 Tiller Road
              London United Kingdom E14 8PX. +447397667543
            </p>
          </div>
          <p>&#169;Little Wheel Tech. Ltd 2025</p>
        </div>
      </div>
    </motion.footer>
  );
}
