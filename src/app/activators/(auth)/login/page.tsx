/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@littlewheel/components/ui/input";
import Link from "next/link";

export default function MobileLoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      console.log("Login attempted with:", { phoneNumber, password });
    }, 2000);
  };

  return (
    <div className="h-full grid items-center">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            Hi! We&apos;ve missed you here.
          </h1>
          <p className="text-sm text-[#344054]">
            Please provide your correct phone number and password.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-[#101928]"
            >
              Mobile Number
            </label>
            <div className="flex items-center gap-1">
              <div className="flex items-center px-3 py-[7.5px] border border-[#E4E7EC] rounded-md bg-[#F0F2F5]">
                <img
                  src="https://flagemoji.com/wp-content/uploads/2020/02/Flag_of_Nigeria.svg"
                  alt="Nigeria Flag"
                  width={24}
                  height={24}
                  className="mr-2 rounded-full"
                />
                <span className="text-sm text-gray-700">+234</span>
              </div>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="000-0000-000"
                className="flex-1 border border-[#E4E7EC] text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#101928]"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pr-10 border border-[#E4E7EC] text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-[#101928] underline hover:text-gray-700"
              >
                Forgot password
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Logging in...</span>
            </div>
          ) : (
            "Login"
          )}
        </button>

        <div className="text-center">
          <span className="text-sm text-[#344054]">
            Don&apos;t have an account?{" "}
          </span>
          <Link
            href="/activators/register"
            className="text-sm underline hover:text-gray-700 font-semibold"
          >
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}
