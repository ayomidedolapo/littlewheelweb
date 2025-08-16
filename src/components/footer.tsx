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
import { Separator } from "./ui/separator";
import CBN from "../../public/uploads/cbn";
import NDIC from "../../public/uploads/ndic";
import Fortress from "../../public/uploads/fortress";

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
    label: "LinkedIn",
  },
  {
    icon: FaTiktok,
    href: "https://www.tiktok.com/@littlewheelhq",
    label: "LinkedIn",
  },
];

export default function Footer() {
  return (
    <footer className="p-6 md:p-12 bg-black text-white">
      <div className="grid md:grid-cols-[1fr_auto] gap-6">
        <div className="p-4">
          <p className="text-sm text-[#F7F9FC] mt-4">Follow us on:</p>
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

        <div className="grid space-y-4 md:space-y-0 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              {contactDetails.map((contact, index) => (
                <li key={index} className="text-sm mb-2">
                  {contact.type === "Email" ? (
                    <Link
                      href={`mailto:${contact.value}`}
                      className="hover:font-bold hover:underline"
                    >
                      {contact.title}: {contact.value}
                    </Link>
                  ) : (
                    <Link
                      href={`tel:${contact.value}`}
                      className="hover:font-bold hover:underline"
                    >
                      {contact.title}: {contact.value}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <p>
            Address: <br />
            Sango Terminal, Sango, Ibadan, Nigeria.
          </p>
        </div>
      </div>

      <Separator className="my-8 bg-[#344054]" />

      <div className="grid space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
        <p className="text-sm text-[#F7F9FC]">
          All Right reserved, 2025 || Little Wheel.
        </p>
        <div className="hidden md:flex items-center gap-2">
          <CBN />
          <NDIC />
          <Fortress />
        </div>
        <div className="md:hidden flex items-center justify-between">
          <CBN size={100} />
          <NDIC size={100} />
          <Fortress size={100} />
        </div>
      </div>
    </footer>
  );
}
