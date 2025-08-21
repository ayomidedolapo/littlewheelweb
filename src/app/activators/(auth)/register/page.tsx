"use client";

import { useState } from "react";
import { Input } from "@littlewheel/components/ui/input";
import { HiMiniUser } from "react-icons/hi2";
import { LuMail } from "react-icons/lu";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@littlewheel/components/ui/select";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import { Button } from "@littlewheel/components/ui/button";
import { EyeOff, Eye, ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import data from "@littlewheel/data/state.json";
import { Value } from "react-phone-number-input";
import InputPhone5 from "@littlewheel/components/input-phone-5";

const states = data.states;

type Step = "S1" | "S2";

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function Page() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("S1");

  // Step 1 form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<Value>();
  const [sex, setSex] = useState("");
  const [dob, setDob] = useState("");
  const [nin, setNin] = useState("");

  // Step 2 form data
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get LGAs for selected state
  const getLocalGovernments = () => {
    const selectedState = states.find((s) => s.name === state);
    return selectedState ? selectedState.local_governments : [];
  };

  // Password validation
  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";

  // Step 1 validation
  const isStep1Valid =
    firstName && lastName && email && phoneNumber && sex && dob && nin;

  // Step 2 validation
  const isStep2Valid =
    country && state && lga && address && isPasswordValid && passwordsMatch;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStep1Valid) {
      console.log("Step 1 validation failed");
      return;
    }

    console.log("Step 1 data:", {
      firstName,
      lastName,
      email,
      phoneNumber,
      sex,
      dob,
      nin,
    });

    setCurrentStep("S2");
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStep2Valid) {
      console.log("Step 2 validation failed");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log("Complete form data:", {
        // Step 1 data
        firstName,
        lastName,
        email,
        phoneNumber,
        sex,
        dob,
        nin,
        // Step 2 data
        country,
        state,
        lga,
        address,
        password,
      });

      setIsLoading(false);

      // Redirect to activators page on successful signup
      router.push("/activators");
    }, 2000);
  };

  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    setLga(""); // Reset LGA when state changes
  };

  const goBackToStep1 = () => {
    setCurrentStep("S1");
  };

  if (currentStep === "S1") {
    return (
      <div>
        <form className="space-y-5" onSubmit={handleStep1Submit}>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="text-sm text-[#344054]">
              Fill in your details in less than 1 minute
            </p>
          </div>

          <ScrollArea className="h-[calc(100vh-235px)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-[#101928]"
                >
                  First Name
                </label>
                <div className="relative">
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="pl-10 text-sm"
                    required
                  />
                  <HiMiniUser
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    color="#667185"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-[#101928]"
                >
                  Last Name
                </label>
                <div className="relative">
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="pl-10 text-sm"
                    required
                  />
                  <HiMiniUser
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    color="#667185"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#101928]"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john.doe@example.com"
                    className="pl-10 text-sm"
                    required
                  />
                  <LuMail
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    color="#667185"
                  />
                </div>
              </div>

              <InputPhone5
                label="Mobile Number"
                id="phone"
                value={phoneNumber}
                onChange={setPhoneNumber}
                className="flex-1 border border-[#E4E7EC] text-sm"
                // required
                disabled
              />

              <div className="grid grid-cols-2 space-x-4">
                <div className="space-y-2">
                  <label
                    htmlFor="sex"
                    className="block text-sm font-medium text-[#101928]"
                  >
                    Sex
                  </label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger className="text-sm" id="sex">
                      {sex
                        ? sex === "male"
                          ? "Male"
                          : "Female"
                        : "Select your sex"}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="dob"
                    className="block text-sm font-medium text-[#101928]"
                  >
                    Date of Birth
                  </label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="nin"
                  className="block text-sm font-medium text-[#101928]"
                >
                  NIN Number
                </label>
                <Input
                  id="nin"
                  type="text"
                  value={nin}
                  onChange={(e) => setNin(e.target.value)}
                  placeholder="e.g. 12345678901"
                  className="text-sm"
                  maxLength={11}
                  required
                />
              </div>
            </div>
          </ScrollArea>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full text-sm font-medium text-white bg-[#101928] rounded-lg hover:bg-[#0d1620] transition-colors disabled:opacity-50"
              disabled={!isStep1Valid}
            >
              Save and Continue
            </Button>

            <div className="text-center text-sm">
              <span className="text-[#344054]">Already have an account? </span>
              <Link
                href="/activators/login"
                className="text-[#101928] font-medium hover:underline"
              >
                Login
              </Link>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Step 2
  return (
    <div>
      <form className="space-y-5" onSubmit={handleStep2Submit}>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Complete your account</h1>
          <p className="text-sm text-[#344054]">
            Almost there! Just a few more details
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-235px)]">
          <div className="space-y-4">
            <button
              type="button"
              onClick={goBackToStep1}
              className="flex items-center gap-2 text-sm text-[#344054] hover:text-[#101928] transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Go Back
            </button>

            <div className="space-y-2">
              <label
                htmlFor="country"
                className="block text-sm font-medium text-[#101928]"
              >
                Country
              </label>
              <Input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Nigeria"
                className="text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 space-x-4">
              <div className="space-y-2">
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-[#101928]"
                >
                  State
                </label>
                <Select value={state} onValueChange={handleStateChange}>
                  <SelectTrigger className="text-sm" id="state">
                    {state ? state : "Select your state"}
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((stateItem) => (
                      <SelectItem key={stateItem.name} value={stateItem.name}>
                        {stateItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lga"
                  className="block text-sm font-medium text-[#101928]"
                >
                  Local Government Area
                </label>
                <Select value={lga} onValueChange={setLga} disabled={!state}>
                  <SelectTrigger className="text-sm" id="lga">
                    {lga ? lga : "Select your LGA"}
                  </SelectTrigger>
                  <SelectContent>
                    {getLocalGovernments().map((lgaItem) => (
                      <SelectItem key={lgaItem} value={lgaItem}>
                        {lgaItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-[#101928]"
              >
                Address
              </label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Anytown"
                className="text-sm"
                required
              />
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
                  placeholder="••••••••"
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

              {/* Password validation indicators */}
              {password && (
                <div className="space-y-1 text-xs">
                  <div
                    className={`flex items-center gap-2 ${
                      passwordValidation.minLength
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <span>{passwordValidation.minLength ? "✓" : "✗"}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      passwordValidation.hasUppercase
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <span>{passwordValidation.hasUppercase ? "✓" : "✗"}</span>
                    <span>One uppercase letter</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      passwordValidation.hasLowercase
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <span>{passwordValidation.hasLowercase ? "✓" : "✗"}</span>
                    <span>One lowercase letter</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      passwordValidation.hasNumber
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <span>{passwordValidation.hasNumber ? "✓" : "✗"}</span>
                    <span>One number</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      passwordValidation.hasSpecialChar
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <span>{passwordValidation.hasSpecialChar ? "✓" : "✗"}</span>
                    <span>One special character</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#101928]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 border border-[#E4E7EC] text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {confirmPassword && (
                <div
                  className={`text-xs flex items-center gap-2 ${
                    passwordsMatch ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <span>{passwordsMatch ? "✓" : "✗"}</span>
                  <span>Passwords match</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full text-sm font-medium text-white bg-[#101928] rounded-lg hover:bg-[#0d1620] transition-colors disabled:opacity-50"
            disabled={!isStep2Valid || isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-[#344054]">Already have an account? </span>
            <Link
              href="/activators/login"
              className="text-[#101928] font-medium hover:underline"
            >
              Login
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
