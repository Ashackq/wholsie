import { env } from "../config/env.js";

// Read credentials from environment
const SMS_API_KEY = env.SMS_API_KEY ?? process.env.SMS_API_KEY ?? "";
const SMS_SENDER = env.SMS_SENDER_ID ?? process.env.SMS_SENDER_ID ?? "WHOLES";
const SMS_ROUTE = env.SMS_ROUTE ?? process.env.SMS_ROUTE ?? "transactional";
const SMS_ENDPOINT = "https://www.smsalert.co.in/api/push.json";

interface SMSPayload {
    phone: string;
    message: string;
}

export async function sendSMS(payload: SMSPayload): Promise<boolean> {
    try {
        if (!SMS_API_KEY) {
            console.error("SMS_API_KEY missing. Set it in server/.env");
            return false;
        }

        const response = await fetch(SMS_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                apikey: SMS_API_KEY,
                sender: SMS_SENDER,
                mobileno: payload.phone,
                text: payload.message,
                route: SMS_ROUTE,
            }).toString(),
        });

        const result = await response.json();
        return response.ok;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("SMS send error:", err);
        return false;
    }
}

export async function sendOTP(phone: string, otp: string): Promise<boolean> {
    return sendSMS({
        phone,
        message: `Your OTP for Login on Wholesiii is ${otp}. This code is valid for 10 minutes. Divaine Leaf Neutra Private Limited`,
    });
}

export async function sendOrderConfirmation(phone: string, orderId: string): Promise<boolean> {
    return sendSMS({
        phone,
        message: `Your order #${orderId} has been confirmed. You will receive a delivery confirmation soon.`,
    });
}

export async function sendShippingNotification(
    phone: string,
    orderId: string,
    trackingId: string,
): Promise<boolean> {
    return sendSMS({
        phone,
        message: `Your order #${orderId} has been shipped. Track: https://track.delhivery.com/track/shipment/${trackingId}`,
    });
}
