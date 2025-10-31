import { NextRequest, NextResponse } from "next/server";
import apiClient from "../../../lib/server-utils/utils";
import { AxiosError } from "axios";

// reCAPTCHA validation
const validateRecaptcha = async (token: string) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await response.json();
  return data.success && data.score > 0.5; // You can tweak this threshold
};

// POST route
export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();

    // Validate reCAPTCHA
    const isValidRecaptcha = await validateRecaptcha(token);
    if (!isValidRecaptcha) {
      return NextResponse.json(
        { error: "reCAPTCHA validation failed" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Submit to backend waitlist endpoint
    const response = await apiClient.post("/waitlists", { email });

    // Handle duplicate or existing users
    if (
      response.data.message?.includes("already") ||
      response.data.message?.includes("existing")
    ) {
      return NextResponse.json(
        { error: "This email is already subscribed" },
        { status: 409 }
      );
    }

    // Handle success
    if (response.data.success) {
      return NextResponse.json(
        { message: "Successfully added" },
        { status: 201 }
      );
    }

    // Unexpected API response
    console.error("Unexpected API response:", response.data);
    return NextResponse.json(
      { error: response.data.message || "Failed to add" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in POST /api/join-waitlist:", error);

    // Handle duplicate response from API
    if (
      error instanceof AxiosError &&
      error.response?.data?.message?.includes("already")
    ) {
      return NextResponse.json(
        { error: "This email is already subscribed" },
        { status: 409 }
      );
    }

    // Fallback
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
