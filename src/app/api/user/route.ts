import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: No token found" },
        { status: 401 }
      );
    }

    const response = await axios.get(
      `${process.env.BACKEND_API_URL}/v1/users/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return NextResponse.json(
      { success: true, user: response.data },
      { status: 200 }
    );
  } catch (error) {
    const err = error as AxiosError;
    return NextResponse.json(
      {
        success: false,
        message: err.response?.data || "Failed to fetch user details",
      },
      { status: err.response?.status || 500 }
    );
  }
}
