import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await axios.post(
      `${process.env.BACKEND_API_URL}/auth/login`,
      body,
      { headers: { "Content-Type": "application/json" } }
    );

    const token = response.data.access_token;

    // Store token in HttpOnly cookie so it’s automatically sent on future requests
    return NextResponse.json(
      { success: true, user: response.data.user || null }, // you can also pass user info
      {
        status: 200,
        headers: {
          "Set-Cookie": `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        },
      }
    );
  } catch (error) {
    const err = error as AxiosError;
    return NextResponse.json(
      {
        success: false,
        message: err.response?.data || "Login failed",
      },
      { status: err.response?.status || 500 }
    );
  }
}
