import { sendEmail, sendEmailWithTemplate } from "./email.js";
import {
  generateInvoiceHTML,
  generateOrderConfirmationHTML,
  type InvoiceData,
} from "./invoice.js";
import {
  generateInvoiceHTML as generatePdfInvoiceHTML,
  type PdfInvoiceData,
} from "./pdfInvoice.js";
import { EmailTemplate } from "../models/EmailTemplate.js";

/**
 * Send order confirmation email to customer
 * @param orderData Order information including customer email and items
 * @returns true if email sent successfully
 */
export async function sendOrderConfirmationEmail(
  orderData: InvoiceData,
): Promise<boolean> {
  try {
    const htmlContent = generateOrderConfirmationHTML(orderData);

    return await sendEmail({
      to: orderData.customerEmail,
      subject: `Order Confirmation - ${orderData.orderId}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return false;
  }
}

/**
 * Send invoice email to customer
 * @param orderData Order information
 * @returns true if email sent successfully
 */
export async function sendInvoiceEmail(
  orderData: InvoiceData,
): Promise<boolean> {
  try {
    const htmlContent = generateInvoiceHTML(orderData);

    return await sendEmail({
      to: orderData.customerEmail,
      subject: `Invoice - ${orderData.orderId}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return false;
  }
}

/**
 * Send shipment tracking email
 * @param customerEmail Customer email
 * @param orderId Order ID
 * @param trackingNumber Tracking number
 * @param estimatedDelivery Estimated delivery date
 * @returns true if email sent successfully
 */
export async function sendShipmentEmail(
  customerEmail: string,
  orderId: string,
  trackingNumber: string,
  estimatedDelivery?: string,
): Promise<boolean> {
  try {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: white; }
                .tracking { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Order is on the Way!</h1>
                </div>
                <div class="content">
                    <p>Hi,</p>
                    <p>Your order <strong>${orderId}</strong> has been shipped!</p>
                    <div class="tracking">
                        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                        ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ""}
                    </div>
                    <p>You can track your package using the tracking number above on our courier partner's website.</p>
                    <p>Thank you for shopping with us!</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this address.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    return await sendEmail({
      to: customerEmail,
      subject: `Your Order ${orderId} is on the Way!`,
      html,
    });
  } catch (error) {
    console.error("Failed to send shipment email:", error);
    return false;
  }
}

/**
 * Send password reset email
 * @param email Customer email
 * @param resetLink Reset password link
 * @param expiryMinutes Link expiry in minutes
 * @returns true if email sent successfully
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  expiryMinutes: number = 30,
): Promise<boolean> {
  try {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: white; }
                .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hi,</p>
                    <p>We received a request to reset your password. Click the button below to create a new password.</p>
                    <a href="${resetLink}" class="button">Reset Password</a>
                    <p>This link will expire in ${expiryMinutes} minutes.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                    <p>For security reasons, never share this link with anyone.</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this address.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    return await sendEmail({
      to: email,
      subject: "Password Reset Request - Wholesiii",
      html,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}

/**
 * Send OTP verification email
 * @param email Customer email
 * @param otp One-time password
 * @param expiryMinutes OTP expiry in minutes
 * @returns true if email sent successfully
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  expiryMinutes: number = 10,
): Promise<boolean> {
  try {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: white; }
                .otp-box { background: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
                .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your OTP Code</h1>
                </div>
                <div class="content">
                    <p>Hi,</p>
                    <p>Use this code to verify your account on Wholesiii:</p>
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                    <p>This code will expire in ${expiryMinutes} minutes.</p>
                    <p>Never share this code with anyone. Our support team will never ask you for this code.</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this address.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    return await sendEmail({
      to: email,
      subject: "Your OTP Code - Wholesiii",
      html,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

/**
 * Send email using a template from database (like PHP system)
 * @param templateId Template identifier (e.g., "order_confirmation")
 * @param toEmail Recipient email
 * @param replacements Key-value pairs to replace in template
 * @returns true if email sent successfully
 */
export async function sendEmailUsingTemplate(
  templateId: string,
  toEmail: string,
  replacements: Record<string, string | number>,
): Promise<boolean> {
  try {
    const template = await EmailTemplate.findOne({
      templateId,
      isActive: true,
    });

    if (!template) {
      console.error(`Email template not found: ${templateId}`);
      return false;
    }

    return await sendEmailWithTemplate(
      toEmail,
      template.subject,
      template.message,
      replacements,
    );
  } catch (error) {
    console.error("Failed to send template email:", error);
    return false;
  }
}

/**
 * Send welcome email to new customer
 * @param email Customer email
 * @param name Customer name
 * @returns true if email sent successfully
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<boolean> {
  try {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: white; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Wholesiii!</h1>
                </div>
                <div class="content">
                    <p>Hi ${name},</p>
                    <p>Welcome to Wholesiii! We're excited to have you on board.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Browse our products</li>
                        <li>Place orders</li>
                        <li>Track your shipments</li>
                        <li>Manage your account</li>
                    </ul>
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    <p>Happy shopping!</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this address.</p>
                </div>
            </div>
        </body>
        </html>
        `;

    return await sendEmail({
      to: email,
      subject: "Welcome to Wholesiii!",
      html,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

/**
 * Send payment completion email with professional invoice
 * Triggered after successful payment (Razorpay webhook)
 * @param invoiceData Complete order and payment information
 * @returns true if email sent successfully
 */
export async function sendPaymentConfirmationEmail(
  invoiceData: PdfInvoiceData,
): Promise<boolean> {
  try {
    const htmlContent = generatePdfInvoiceHTML(invoiceData);

    // Create email with professional invoice
    const success = await sendEmail({
      to: invoiceData.customerEmail,
      subject: `Payment Received & Invoice - Order #${invoiceData.orderId}`,
      html: htmlContent,
    });

    if (success) {
      console.log(
        `Payment confirmation email sent to ${invoiceData.customerEmail} for order ${invoiceData.orderId}`,
      );
    }
    return success;
  } catch (error) {
    console.error(
      `Failed to send payment confirmation email for order ${invoiceData.orderId}:`,
      error,
    );
    return false;
  }
}

/**
 * Helper function to prepare invoice data from order object
 * Converts database order format to invoice format
 */
export async function prepareInvoiceData(order: any): Promise<PdfInvoiceData> {
  const { User } = await import("../models/User.js");

  const user = await User.findById(order.userId);
  if (!user) {
    throw new Error(`User not found for order ${order._id}`);
  }

  return {
    orderId: order.orderId || order._id.toString(),
    orderNo: order.orderNo,
    orderDate: order.createdAt || new Date(),
    customerName:
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Customer",
    customerEmail: user.email,
    customerPhone: user.phone || undefined,
    shippingAddress: order.shippingAddress || {},
    billingAddress: user.address
      ? {
          street: user.address.street || undefined,
          city: user.address.city || undefined,
          state: user.address.state || undefined,
          postalCode: user.address.postalCode || undefined,
          country: user.address.country || undefined,
        }
      : undefined,
    items: (order.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity || 1,
      price: item.price || 0,
      amount: (item.price || 0) * (item.quantity || 1),
    })),
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    shippingCost: order.shippingCost || 0,
    discount: order.discount || 0,
    total: order.total || 0,
    paymentMethod: order.paymentMethod || "Razorpay",
    paymentStatus: "Completed",
    notes: order.notes || "",
    storeName: "Wholesiii",
    storeEmail: process.env.MAIL_FROM || "support@wholesiii.com",
    storePhone: process.env.STORE_PHONE || "+91-1234567890",
    storeAddress: process.env.STORE_ADDRESS || "India",
    gstNumber: process.env.GST_NUMBER,
  };
}
