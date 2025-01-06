import { NextRequest, NextResponse } from "next/server";
import apiClient from "../server-utils/utils";

const validateRecaptcha = async (token: string) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    }
  );
  const data = await response.json();
  return data.success && data.score > 0.5; // Adjust the score threshold as needed
};

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();

    // Validate reCAPTCHA token
    const isValidRecaptcha = await validateRecaptcha(token);
    if (!isValidRecaptcha) {
      return NextResponse.json(
        { error: "reCAPTCHA validation failed" },
        { status: 400 }
      );
    }

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const response = await apiClient.post("/waitlists", { email });

    // Handle the case where user already exists
    if (
      response.data.message?.includes("already") ||
      response.data.message?.includes("existing")
    ) {
      return NextResponse.json(
        { error: "This email is already subscribed" },
        { status: 409 }
      );
    }

    // Handle successful addition
    if (response.data.success) {
      return NextResponse.json(
        { message: "Successfully added" },
        { status: 201 }
      );
    }

    // If we get here, it's an unexpected response
    console.error("Unexpected API response:", response.data);
    return NextResponse.json(
      { error: response.data.message || "Failed to add" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in POST /api/join-waitlist:", error);

    // Check if the error response contains our duplicate message
    if (error.response?.data?.message?.includes("already")) {
      return NextResponse.json(
        { error: "This email is already subscribed" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
