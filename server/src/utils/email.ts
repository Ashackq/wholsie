import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env.js";

let transporter: Transporter;

/**
 * Initialize the email transporter (SMTP connection)
 */
function initializeTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: env.MAIL_USER,
      pass: env.MAIL_PASSWORD,
    },
  });

  return transporter;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

/**
 * Send email using SMTP
 * @param payload Email configuration
 * @returns true if successful, false otherwise
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    if (!env.MAIL_PASSWORD) {
      console.error("MAIL_PASSWORD not configured in environment variables");
      return false;
    }

    const transporter = initializeTransporter();

    const result = await transporter.sendMail({
      from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments,
    });

    console.log("Email sent successfully:", result.messageId);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

/**
 * Send email with template replacements
 * Replaces placeholder keys with values
 * @param to Recipient email address(es)
 * @param subject Email subject (can contain placeholders)
 * @param htmlTemplate HTML template (can contain placeholders)
 * @param replacements Object with key-value pairs to replace in template
 * @returns true if successful, false otherwise
 */
export async function sendEmailWithTemplate(
  to: string | string[],
  subject: string,
  htmlTemplate: string,
  replacements: Record<string, string | number>,
): Promise<boolean> {
  let finalSubject = subject;
  let finalHtml = htmlTemplate;

  // Replace placeholders with values
  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    finalSubject = finalSubject.replace(
      new RegExp(placeholder, "g"),
      String(value),
    );
    finalHtml = finalHtml.replace(new RegExp(placeholder, "g"), String(value));
  });

  return sendEmail({
    to,
    subject: finalSubject,
    html: finalHtml,
  });
}

/**
 * Verify SMTP connection
 * Call this once during app startup to verify email configuration
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = initializeTransporter();
    await transporter.verify();
    console.log("Email service ready");
    return true;
  } catch (error) {
    console.error("Email service failed:", error);
    return false;
  }
}
