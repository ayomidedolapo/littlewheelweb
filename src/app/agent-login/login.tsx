"use client";

import { useState } from "react";
import { Eye, EyeOff, Phone } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function MobileLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Check if both fields are filled
  const isFormValid = phoneNumber.length >= 10 && password.length >= 5;

  const handleSignup = () => {
    // Navigate to signup page
    window.location.href = "#";
  };

  const router = useRouter();

  const handleForgotPin = () => {
    // Navigate to forgot pin page
    window.location.href = "#";
  };

  const handleLogin = async () => {
    if (isFormValid) {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: phoneNumber.startsWith("234")
              ? phoneNumber
              : `234${phoneNumber.slice(phoneNumber.startsWith("0") ? 1 : 0)}`,
            password,
            deviceToken: "mobile-app-token",
          }),
        });

        const data = await res.json();

        if (data.success) {
          console.log("Login successful!", data.data);
          router.push("/dash");
        } else {
          // Properly extract error message
          let errorMessage = "Login failed";
          if (data.message) {
            if (typeof data.message === "string") {
              errorMessage = data.message;
            } else if (
              typeof data.message === "object" &&
              data.message.message
            ) {
              errorMessage = data.message.message;
            } else {
              errorMessage = JSON.stringify(data.message);
            }
          }
          alert(errorMessage);
        }
      } catch (err) {
        console.error("Error logging in:", err);
        alert("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, centered card on desktop */}
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-end items-center p-4 pt-6 bg-white">
          <button
            onClick={handleSignup}
            className="text-gray-600 text-xs font-bold underline hover:text-gray-800 transition-colors"
          >
            Signup account
          </button>
        </div>

        {/* Main Content */}
        <div className="px-6 py-4 bg-white">
          {/* Profile Section with User Avatar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center relative">
              {/* User Avatar - Replace with user's uploaded image */}
              <Image
                src="/images/user-avatar.jpg"
                alt="User Avatar"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-md font-bold text-gray-800">
                Hi <span className="text-xl">👋 </span>
              </span>
            </div>
          </div>

          {/* Welcome Back */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome Back
          </h1>

          {/* Mobile Number Section */}
          <div className="mb-5">
            <label className="text-gray-700 font-bold mb-2 block text-sm">
              Mobile Number
            </label>

            <div className="flex gap-2">
              {/* Country Code with Nigeria Flag */}
              <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3 min-w-fit">
                <div className="w-5 h-5 rounded-full overflow-hidden mr-2 flex items-center justify-center bg-white">
                  <Image
                    src="https://flagpedia.net/data/flags/w580/ng.png"
                    alt="Nigeria Flag"
                    width={24}
                    height={24}
                    className="w-full h-full object-cotain"
                  />
                </div>
                <span className="text-gray-700 font-bold text-sm">+234</span>
              </div>

              {/* Phone Number Input */}
              <div className="flex-1">
                <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3">
                  <Phone className="w-4 h-4 text-black mr-2" />
                  <input
                    type="tel"
                    placeholder="000-0000-000"
                    value={phoneNumber}
                    onChange={(e) => {
                      // Allow only numbers and limit to 11 digits
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) {
                        setPhoneNumber(value);
                      }
                    }}
                    onKeyPress={(e) => {
                      // Prevent non-numeric characters from being typed
                      if (
                        !/[0-9]/.test(e.key) &&
                        e.key !== "Backspace" &&
                        e.key !== "Delete" &&
                        e.key !== "Tab" &&
                        e.key !== "ArrowLeft" &&
                        e.key !== "ArrowRight"
                      ) {
                        e.preventDefault();
                      }
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="mb-5">
            <label className="text-gray-700 font-bold mb-2 block text-sm">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-100 rounded-xl px-3 py-3 text-gray-700 placeholder-gray-400 outline-none pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-black" />
                ) : (
                  <Eye className="w-4 h-4 text-black" />
                )}
              </button>
            </div>

            <div className="text-right mt-2">
              <button
                onClick={handleForgotPin}
                className="text-gray-600 text-xs font-bold underline hover:text-gray-800 transition-colors"
              >
                Forgot Login Pin
              </button>
            </div>
          </div>

          {/* Flexible Spacer */}
          <div className="flex-1 min-h-[120px]"></div>

          {/* Login Button */}
          <div className="pb-4">
            <button
              onClick={handleLogin}
              className={`w-full font-semibold py-3 px-6 rounded-xl transition-colors duration-200 text-sm ${
                isFormValid
                  ? "bg-black hover:bg-gray-800 text-white"
                  : "bg-gray-300 text-gray-700 cursor-not-allowed"
              }`}
              disabled={!isFormValid}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
