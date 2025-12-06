"use client";
import {
  FaLinkedin,
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from "next/link";
import { motion } from "framer-motion";
import { Separator } from "./ui/separator";

import Image from "next/image";

const contactDetails = [
  { type: "Phone", title: "Phone Number", value: "09160006929" },
  { type: "Email", title: "Email Address", value: "info@littlewheel.app" },
];

const socialLinks = [
  {
    icon: FaInstagram,
    href: "https://www.instagram.com/little_wheel_hq/",
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
    label: "YouTube",
  },
  {
    icon: FaTiktok,
    href: "https://www.tiktok.com/@littlewheelhq",
    label: "TikTok",
  },
];

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: -100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-black text-white px-6 py-12 md:px-12"
    >
      {/* Desktop Layout - Large screens */}
      <div className="hidden lg:block">
        {/* Logo at center top */}
        <div className="flex justify-center mb-8">
          <div className="w-48 h-12 rounded flex items-center justify-center">
            <Image
              src="/uploads/logo.png"
              alt="Logo"
              width={190} // adjust based on actual logo size
              height={100}
            />
          </div>
        </div>
        <br />

        {/* Three column layout */}
        <div className="grid grid-cols-3 gap-8 items-start">
          {/* Left Column - Social Links */}
          <div>
            <p className="text-sm text-[#F7F9FC] mb-4">Follow us on:</p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <social.icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Center Column - Contact Info */}
          <div className="text-center">
            <div className="space-y-3">
              {contactDetails.map((contact, index) => (
                <div key={index} className="text-sm">
                  {contact.type === "Email" ? (
                    <div>
                      <span>{contact.title}: </span>
                      <Link
                        href={`mailto:${contact.value}`}
                        className="hover:underline text-white"
                      >
                        {contact.value}
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <span>{contact.title}: </span>
                      <Link
                        href={`tel:${contact.value}`}
                        className="hover:underline text-white"
                      >
                        {contact.value}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Address */}
          <div className="text-right">
            <p className="text-sm">
              <span className="font-medium">Address:</span>
              <br />
              Sango Terminal, Sango, Ibadan, Nigeria.
            </p>
          </div>
        </div>

        <Separator className="my-8 bg-[#344054]" />

        {/* Bottom section with copyright and logos */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-8">
          <p className="text-sm text-[#F7F9FC] text-center md:text-center">
            All Right reserved, 2025 || Little Wheel.
          </p>
          
        </div>
      </div>

      {/* Mobile Layout - Small screens */}
      <div className="lg:hidden">
        {/* Logo at top */}
        <div className="flex justify-center mb-8">
          <div className="w-48 h-12 rounded flex items-center justify-center">
            <Image
              src="/uploads/logo.png"
              alt="Logo"
              width={190} // adjust to your logo's actual width
              height={40} // adjust to your logo's actual height
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 mb-6">
          {contactDetails.map((contact, index) => (
            <div key={index} className="text-sm">
              {contact.type === "Email" ? (
                <div>
                  <span className="font-medium">{contact.title}: </span>
                  <Link
                    href={`mailto:${contact.value}`}
                    className="hover:underline text-white underline"
                  >
                    {contact.value}
                  </Link>
                </div>
              ) : (
                <div>
                  <span className="font-medium">{contact.title}: </span>
                  <Link
                    href={`tel:${contact.value}`}
                    className="hover:underline text-white"
                  >
                    {contact.value}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Address */}
        <div className="mb-6">
          <p className="text-sm">
            <span className="font-medium">Address:</span>
            <br />
            Sango Terminal, Sango, Ibadan, Nigeria.
          </p>
        </div>

        {/* Social Links */}
        <div className="mb-8">
          <p className="text-sm text-[#F7F9FC] mb-4">Follow us on:</p>
          <div className="flex space-x-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>

        <Separator className="my-8 bg-[#344054]" />

        {/* Bottom section - logos removed */}
        <div className="space-y-4">
          <p className="text-sm text-[#F7F9FC]">
            All Right reserved, 2025 || Little Wheel
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
