"use client";
import { Separator } from "@littlewheel/components/ui/separator";
import { FaLinkedin, FaInstagram, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  { id: 1, name: "Home", to: "/" },
  { id: 5, name: "Blog", to: "/blog" },
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
  { icon: FaInstagram, href: "#", label: "Instagram" },
  { icon: FaFacebook, href: "#", label: "Facebook" },
  { icon: FaXTwitter, href: "#", label: "X" },
  { icon: FaLinkedin, href: "#", label: "LinkedIn" },
];

export default function BlogFooter() {
  const [footerRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });
  return (
    <motion.footer
      initial={{ opacity: 0, y: -50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="p-6 md:p-12 font-sans font-medium"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Image
            src="/uploads/logo.svg"
            alt="LitteWheel"
            width={340}
            height={90}
            className="max-w-full"
          />
          <p className="text-sm text-[#344054] px-4">
            Build Wealth Little by Little
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <motion.ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <motion.li
                  key={index}
                  ref={footerRef}
                  initial={{ opacity: 0, x: 300 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Link
                    href={link.to}
                    className="hover:font-bold hover:underline text-sm"
                  >
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <motion.ul className="space-y-2">
              {legalLinks.map((link, index) => (
                <motion.li
                  key={index}
                  ref={footerRef}
                  initial={{ opacity: 0, y: -50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <a
                    href={link.href}
                    className="hover:font-bold hover:underline text-sm"
                  >
                    {link.name}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <div className="relative z-10">
            <h3 className="font-semibold mb-4">Contact</h3>
            <motion.ul className="space-y-2">
              {contactDetails.map((contact, index) => (
                <motion.li
                  key={index}
                  ref={footerRef}
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-sm mb-2"
                >
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
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>

      <Separator className="my-8 bg-[#DADADA]" />

      <div className="md:flex md:justify-between md:space-y-0 space-y-5">
        <div className="w-full md:w-[70%] space-y-5 text-[#344054] text-sm">
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
          <p>All Rights Reserved, 2025 || Little Wheel.</p>
        </div>

        <div className="flex space-x-4">
          {socialLinks.map((social, index) => (
            <motion.a
              key={index}
              ref={footerRef}
              initial={{ opacity: 0, y: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              href={social.href}
              aria-label={social.label}
              className="hover:text-[#014239]"
            >
              <social.icon size={24} />
            </motion.a>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
