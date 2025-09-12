"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User2,
  AtSign,
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
} from "lucide-react";

export default function PersonalDetailsPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    gender: "",
    dob: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // --- Validation
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.username.trim()) e.username = "Username is required.";
    if (!form.gender) e.gender = "Select a gender.";
    if (!form.dob) e.dob = "Date of birth is required.";
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const handleChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [field]: e.target.value }));

  const handleBack = () => router.back();

  const handleContinue = () => {
    if (!isValid) {
      setTouched({
        firstName: true,
        lastName: true,
        username: true,
        gender: true,
        dob: true,
      });
      return;
    }
    router.push("/onboard-form/components/address");
  };

  const fieldBox =
    "w-full rounded-lg border border-gray-300 focus:border-black focus:ring-0 placeholder-gray-400 bg-white h-12 pl-10 pr-3 text-sm";

  const labelCls =
    "text-sm font-medium text-gray-800 flex items-center gap-1 mb-2";
  const errorCls = "mt-1 text-xs text-red-600";

  // step state
  const isPhoneVerified = true;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-3xl bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 pt-8 bg-white">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 md:px-8 pb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            You are almost done!
          </h1>
          <p className="text-sm text-gray-600 mt-1 mb-6">
            We need a few details to complete their account opening
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form */}
            <div className="md:col-span-2 space-y-5">
              {/* First Name */}
              <div>
                <label className={labelCls}>
                  First Name<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={handleChange("firstName")}
                    placeholder="e.g. John"
                    className={fieldBox}
                  />
                </div>
                {touched.firstName && errors.firstName && (
                  <p className={errorCls}>{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className={labelCls}>
                  Last Name<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={handleChange("lastName")}
                    placeholder="e.g. Doe"
                    className={fieldBox}
                  />
                </div>
                {touched.lastName && errors.lastName && (
                  <p className={errorCls}>{errors.lastName}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className={labelCls}>
                  Username/Nickname<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={handleChange("username")}
                    placeholder="e.g PappyShinzy"
                    className={fieldBox}
                  />
                </div>
                {touched.username && errors.username && (
                  <p className={errorCls}>{errors.username}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls}>
                  Gender<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.gender}
                    onChange={handleChange("gender")}
                    className={`${fieldBox} appearance-none pr-8 cursor-pointer`}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {touched.gender && errors.gender && (
                  <p className={errorCls}>{errors.gender}</p>
                )}
              </div>

              {/* DOB */}
              <div>
                <label className={labelCls}>
                  Date of Birth<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.dob}
                    onChange={handleChange("dob")}
                    className={`${fieldBox} [color-scheme:light]`}
                  />
                </div>
                {touched.dob && errors.dob && (
                  <p className={errorCls}>{errors.dob}</p>
                )}
              </div>
            </div>

            {/* Steps */}
            <aside className="md:col-span-1">
              <div className="mb-15 mt-20">
                <h3 className="text-gray-900 font-semibold text-sm mb-4 underline">
                  Steps to Onboard New Users
                </h3>

                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isPhoneVerified ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Verify Phone Number
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Add Personal Details
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Add User Address
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Face Capturing
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <button
              onClick={handleContinue}
              disabled={!isValid}
              className={`w-full md:w-auto px-6 py-4 rounded-xl text-sm font-semibold transition-colors ${
                isValid
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Save and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
