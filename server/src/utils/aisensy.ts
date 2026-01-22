// Aisensy integration for WhatsApp/SMS customer communication
// https://www.aisensy.com/
// Requires: API key and phone ID

const AISENSY_API_BASE = "https://api.aisensy.com/v1/";

interface AisensyRequest {
    apiKey: string;
    endpoint: string;
    method?: string;
    data?: Record<string, unknown>;
}

export async function aisensyRequest(req: AisensyRequest): Promise<Record<string, unknown>> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
    };

    try {
        const response = await fetch(`${AISENSY_API_BASE}${req.endpoint}`, {
            method: req.method || "POST",
            headers,
            body: JSON.stringify(req.data || {}),
        });

        if (!response.ok) {
            throw new Error(`Aisensy API error: ${response.statusText}`);
        }

        return response.json();
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Aisensy request error:", err);
        throw err;
    }
}

export async function sendWhatsAppMessage(
    apiKey: string,
    phoneId: string,
    to: string,
    message: string,
): Promise<Record<string, unknown>> {
    return aisensyRequest({
        apiKey,
        endpoint: "message/send",
        data: {
            phoneId,
            to: `91${to.replace(/\D/g, "").slice(-10)}`, // Ensure +91 format
            message,
            messageType: "text",
        },
    });
}

export async function sendOrderUpdate(
    apiKey: string,
    phoneId: string,
    phone: string,
    orderId: string,
    status: string,
): Promise<Record<string, unknown>> {
    const messages: Record<string, string> = {
        confirmed: `Your order #${orderId} has been confirmed. We're preparing for shipment.`,
        shipped: `Your order #${orderId} has been shipped and is on its way!`,
        delivered: `Your order #${orderId} has been delivered. Thank you for shopping with Wholesii!`,
        cancelled: `Your order #${orderId} has been cancelled.`,
    };

    return sendWhatsAppMessage(apiKey, phoneId, phone, messages[status] || `Update: Order #${orderId}`);
}
