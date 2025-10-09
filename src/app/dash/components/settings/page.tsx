"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, PropsWithChildren } from "react";
import {
  ArrowLeft,
  ChevronRight,
  UserRound,
  Shield,
  Building2,
  Headphones,
  XCircle,
  LogOut,
  Phone,
  MessageCircle,
  Mail,
  X,
} from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner"; // ✅ use your loader

/* ========= Real contacts ========= */
const SUPPORT_PHONE = "+2349160006929";
const SUPPORT_WHATSAPP_LINK =
  "https://wa.me/2349160006929?text=Hey%20Little%20Wheel!";
const SUPPORT_EMAIL = "support@littlewheel.app";
/* ================================= */

function SectionTitle({ children }: PropsWithChildren) {
  return (
    <p className="px-4 text-[12px] font-semibold text-gray-600">{children}</p>
  );
}

type ItemProps = {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onNavigate?: (href: string) => void;
};

function RowItem({
  label,
  icon,
  href,
  onClick,
  destructive,
  ariaLabel,
  disabled,
  onNavigate,
}: ItemProps) {
  const handle = () => {
    if (disabled) return;
    if (onClick) return onClick();
    if (href && onNavigate) onNavigate(href);
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={ariaLabel || label}
      disabled={disabled}
      className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800">
          {icon}
        </div>
        <span
          className={`text-[13px] ${
            destructive ? "text-red-600 font-semibold" : "text-gray-900"
          }`}
        >
          {label}
        </span>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [supportOpen, setSupportOpen] = useState(false);

  // route transition state for overlay
  const [isPending, startTransition] = useTransition();

  const goBack = () => router.back();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  const logout = () => {
    try {
      localStorage.removeItem("lw_token");
    } catch {}
    startTransition(() => {
      router.replace("/agent-login");
    });
  };

  return (
    <>
      {/* global logo spinner while routing / logout */}
      <LogoSpinner show={isPending} invert />

      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-start justify-center p-0 md:p-4">
        <div className="w-full max-w-sm bg-white md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 sticky top-0 bg-white/90 backdrop-blur z-10 border-b md:border-0">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="mt-2 text-xl font-extrabold">Account</h1>
          </div>

          <div className="space-y-5 py-4">
            {/* Profile */}
            <SectionTitle>Profile</SectionTitle>
            <div className="px-4">
              <RowItem
                label="Personal Information"
                icon={<UserRound className="h-5 w-5" />}
                href="/dash/components/settings/personal"
                onNavigate={navigate}
                disabled={isPending}
              />
            </div>

            {/* Settings */}
            <SectionTitle>Settings</SectionTitle>
            <div className="px-4 grid gap-3">
              <RowItem
                label="Security"
                icon={<Shield className="h-5 w-5" />}
                href="/dash/components/settings/security"
                onNavigate={navigate}
                disabled={isPending}
              />
              <RowItem
                label="Withdrawal Bank"
                icon={<Building2 className="h-5 w-5" />}
                href="/dash/components/settings/bank"
                onNavigate={navigate}
                disabled={isPending}
              />
            </div>

            {/* General */}
            <SectionTitle>General</SectionTitle>
            <div className="px-4 grid gap-3">
              <RowItem
                label="Customer Service"
                icon={<Headphones className="h-5 w-5" />}
                onClick={() => setSupportOpen(true)} // bottom sheet
                disabled={isPending}
              />
              <RowItem
                label="Close Account"
                icon={<XCircle className="h-5 w-5" />}
                href="/dash/components/settings/close"
                onNavigate={navigate}
                disabled={isPending}
              />
              <RowItem
                label="Log Out"
                icon={<LogOut className="h-5 w-5 text-red-600" />}
                destructive
                onClick={logout}
                disabled={isPending}
              />
            </div>

            <div className="h-6" />
          </div>
        </div>
      </div>

      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        phone={SUPPORT_PHONE}
        whatsappLink={SUPPORT_WHATSAPP_LINK}
        email={SUPPORT_EMAIL}
      />
    </>
  );
}

/* ======================= Bottom Sheet ======================= */
function SupportSheet({
  open,
  onClose,
  phone,
  whatsappLink,
  email,
}: {
  open: boolean;
  onClose: () => void;
  phone: string;
  whatsappLink: string; // full link with prefilled text
  email: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sheet container */}
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-sm transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-4 mb-4 rounded-2xl bg-white shadow-2xl">
          {/* Grab handle + close */}
          <div className="relative px-4 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <h3 className="text-center text-[18px] font-extrabold text-gray-900">
              Contact Little Wheel support
            </h3>

            <div className="mt-5 grid grid-cols-3 gap-4 text-center">
              {/* Call */}
              <a
                href={phone ? `tel:${phone}` : undefined}
                onClick={(e) => {
                  if (!phone) e.preventDefault();
                }}
                className="group"
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-gray-900" />
                </div>
                <div className="mt-2 text-[13px] text-gray-800">Call</div>
              </a>

              {/* WhatsApp (full link) */}
              <a
                href={whatsappLink || undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!whatsappLink) e.preventDefault();
                }}
                className="group"
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-gray-900" />
                </div>
                <div className="mt-2 text-[13px] text-gray-800">Chat</div>
              </a>

              {/* Email */}
              <a
                href={email ? `mailto:${email}` : undefined}
                onClick={(e) => {
                  if (!email) e.preventDefault();
                }}
                className="group"
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-gray-900" />
                </div>
                <div className="mt-2 text-[13px] text-gray-800">Email</div>
              </a>
            </div>

            <p className="mt-6 text-center text-[12px] text-gray-600 leading-relaxed">
              No matter which option you choose, you&apos;ll be connected with a
              helpful team member who&apos;s eager to make your day better!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
