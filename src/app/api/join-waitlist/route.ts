import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import apiClient from "../server-utils/utils";

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

    // Check if the email already exists in the waitlist
    const existingEntry = await apiClient.get(`/waitlists?email=${email}`);
    if (existingEntry.data && existingEntry.data.length > 0) {
      return NextResponse.json(
        { error: "This email is already subscribed to the waitlist." },
        { status: 409 } // Conflict status code
      );
    }

    // Add the email to the waitlist
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
      from: `"Littlewheel Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Littlewheel!",
      text: `Dear Valued Subscriber,
    
    Thank you for joining the Littlewheel waitlist! We’re delighted to have you with us as we prepare to share exciting updates and developments.
    
    Stay tuned for more information coming your way!
    
    Warm regards,
    The Littlewheel Team`,
      html: `
        <h1 style="font-size: 24px; color: #333;">Welcome to Littlewheel!</h1>
        <p style="font-size: 16px; color: #555;">Dear Valued Subscriber,</p>
        <p style="font-size: 16px; color: #555;">Thank you for joining the Littlewheel waitlist! We’re delighted to have you with us as we prepare to share exciting updates and developments.</p>
        <p style="font-size: 16px; color: #555;">Stay tuned for more information coming your way!</p>
        <p style="font-size: 16px; color: #555;">Warm regards,</p>
        <p style="font-size: 16px; color: #555;"><strong>The Littlewheel Team</strong></p>
      `,
    };

    // Send notification email to admins
    const adminMailOptions = {
      from: `"Littlewheel Team" <${process.env.EMAIL_USER}>`,
      to: adminEmails.join(", "),
      subject: "Notification: New Waitlist Subscription",
      text: `Hello Team,
    
    We have a new waitlist subscriber.
    
    Details:
    - Email: ${email}
    - Date: ${new Date().toLocaleString()}
    
    Best regards,
    The Littlewheel System`,
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
        <p style="font-size: 16px; color: #555;"><strong>The Littlewheel System</strong></p>
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
