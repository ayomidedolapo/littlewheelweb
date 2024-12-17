import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import apiClient from "../server-utils/utils"; // Import the apiClient

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Use the reusable apiClient for the API request
    await apiClient.post("/waitlists", { email });

    // Safely parse admin emails
    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim())
      : [];

    if (adminEmails.length === 0) {
      throw new Error("No admin emails configured");
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send confirmation email to subscriber
    const subscriberMailOptions = {
      from: `"littlewheel-landing Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to littlewheel-landing!",
      text: `Dear Valued Subscriber,
    
    Thank you for joining the littlewheel-landing waitlist! We’re delighted to have you with us as we prepare to share exciting updates and developments.
    
    Stay tuned for more information coming your way!
    
    Warm regards,
    The littlewheel-landing Team`,
      html: `
        <h1 style="font-size: 24px; color: #333;">Welcome to littlewheel-landing!</h1>
        <p style="font-size: 16px; color: #555;">Dear Valued Subscriber,</p>
        <p style="font-size: 16px; color: #555;">Thank you for joining the littlewheel-landing waitlist! We’re delighted to have you with us as we prepare to share exciting updates and developments.</p>
        <p style="font-size: 16px; color: #555;">Stay tuned for more information coming your way!</p>
        <p style="font-size: 16px; color: #555;">Warm regards,</p>
        <p style="font-size: 16px; color: #555;"><strong>The littlewheel-landing Team</strong></p>
      `,
    };

    // Send notification email to admins
    const adminMailOptions = {
      from: `"littlewheel-landing Team" <${process.env.EMAIL_USER}>`,
      to: adminEmails.join(", "),
      subject: "Notification: New Waitlist Subscription",
      text: `Hello Team,
    
    We have a new waitlist subscriber.
    
    Details:
    - Email: ${email}
    - Date: ${new Date().toLocaleString()}
    
    Best regards,
    The littlewheel-landing System`,
      html: `
        <h1 style="font-size: 20px; color: #333;">New Waitlist Subscription Notification</h1>
        <p style="font-size: 16px; color: #555;">Hello Team,</p>
        <p style="font-size: 16px; color: #555;">We have a new waitlist subscriber.</p>
        <p style="font-size: 16px; color: #555;"><strong>Details:</strong></p>
        <ul style="font-size: 16px; color: #555;">
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p style="font-size: 16px; color: #555;">Best regards,</p>
        <p style="font-size: 16px; color: #555;"><strong>The littlewheel-landing System</strong></p>
      `,
    };

    await Promise.all([
      transporter.sendMail(subscriberMailOptions),
      transporter.sendMail(adminMailOptions),
    ]);

    return NextResponse.json(
      {
        message:
          "You’ve successfully joined the waitlist! 🎉 Keep an eye on your inbox for updates. 📩",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
