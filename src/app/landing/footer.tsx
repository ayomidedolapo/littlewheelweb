import { Separator } from "@littlewheel-landing/components/ui/separator";
import {
  PiInstagramLogoBold,
  PiFacebookLogoFill,
  PiXLogoBold,
  PiLinkedinLogoBold,
} from "react-icons/pi";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const quickLinks = [
  { name: "Home", to: "home" },
  { name: "About", to: "about" },
  { name: "Services", to: "services" },
  { name: "FAQ", to: "faq" },
];

const legalLinks = [
  { name: "Terms and Condition", href: "#" },
  { name: "Privacy Policy", href: "#" },
];

const contactDetails = [
  { type: "Phone", value: "+234 803 784 78749" },
  { type: "Phone", value: "+234 803 784 78749" },
  { type: "Email", value: "test@gmail.com" },
];

const socialLinks = [
  { icon: PiInstagramLogoBold, href: "#", label: "Instagram" },
  { icon: PiFacebookLogoFill, href: "#", label: "Facebook" },
  { icon: PiXLogoBold, href: "#", label: "X" },
  { icon: PiLinkedinLogoBold, href: "#", label: "LinkedIn" },
];

export default function Footer() {
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };
  const [footerRef] = useInView({
    threshold: 0.9,
    triggerOnce: false,
  });
  return (
    <motion.footer
      initial={{ opacity: 0, y: -50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="p-12 bg-gray-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <img
            src="uploads/logo.svg"
            alt="littlewheel-landing"
            width={340}
            height={90}
          />
          <p className="text-sm text-gray-700">
            Daily Traditional Savings Meets Digital Innovation
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {/* Quick Links */}
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
                  <button
                    onClick={() => scrollToSection(link.to)}
                    className="hover:text-[#3b7ced] text-sm"
                  >
                    {link.name}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Legal Links */}
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
                  <a href={link.href} className="hover:text-[#3b7ced] text-sm">
                    {link.name}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <motion.ul className="space-y-2">
              {contactDetails.map((contact, index) => (
                <motion.li
                  key={index}
                  ref={footerRef}
                  initial={{ opacity: 0, x: -300 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {contact.type === "Email" ? (
                    <a
                      href={`mailto:${contact.value}`}
                      className="hover:text-[#3b7ced] text-sm"
                    >
                      {contact.value}
                    </a>
                  ) : (
                    <p className="text-sm">{contact.value}</p>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>

      <Separator className="my-8 bg-[#DADADA]" />

      <div className="md:flex md:justify-between md:space-y-0 space-y-5">
        <div className="w-full md:w-2/5 space-y-5 text-[#344054] text-sm">
          <p>
            We empower people from diverse backgrounds by creating a financial
            system that’s accessible to them and providing the tools needed for
            wealth creation and maintenance. We set a global standard for
            exceptional financial services.
          </p>
          <p>All Rights Reserved, 2024 || Designed with LOVE.</p>
        </div>

        {/* Social Links */}
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
              className="text-gray-600 hover:text-[#3b7ced]"
            >
              <social.icon size={24} />
            </motion.a>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
