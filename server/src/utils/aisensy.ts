// Aisensy Campaign API integration
// Endpoint: https://backend.aisensy.com/campaign/t1/api/v2

const AISENSY_API_BASE = process.env.AISENSY_API_URL || "https://backend.aisensy.com/campaign/t1/api/v2";

interface AisensyRequest {
    method?: string;
    data?: Record<string, unknown>;
}

/**
 * Core Aisensy request handler (Campaign API)
 * - apiKey goes in request body
 * - Used for template campaigns (text or media)
 */
export async function aisensyRequest(
    req: AisensyRequest,
): Promise<Record<string, unknown>> {
    const response = await fetch(AISENSY_API_BASE, {
        method: req.method || "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(req.data || {}),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Aisensy API error ${response.status}: ${errText}`);
    }

    return response.json();
}

/* =========================================================
   TRACKING LINK CAMPAIGN
   Template: "Track your order here: {{1}}"
========================================================= */
export async function sendTrackingLinkCampaign(
    apiKey: string,
    phone: string,
    trackingUrl: string,
): Promise<Record<string, unknown>> {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    return aisensyRequest({
        data: {
            apiKey,
            campaignName: "tracking_link_camp",
            destination: cleanPhone,
            userName: "Wholesiii",
            templateParams: [trackingUrl],
            source: "order-system",
            media: {},
            buttons: [],
            carouselCards: [],
            location: {},
            attributes: {},
        },
    });
}

export async function sendOrderShippedWithTracking(
    apiKey: string,
    phone: string,
    trackingNumber: string,
): Promise<Record<string, unknown>> {
    const trackingUrl = `https://track.delhivery.com/${trackingNumber}`;

    return sendTrackingLinkCampaign(apiKey, phone, trackingUrl);
}

/* =========================================================
   INVOICE PDF CAMPAIGN
   Template Example:
   "Your invoice is attached."
   (No template params required unless you add them)
========================================================= */
export async function sendInvoiceCampaign(
    apiKey: string,
    phone: string,
    invoicePdfUrl: string,
    fileName = "Invoice.pdf",
): Promise<Record<string, unknown>> {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    return aisensyRequest({
        data: {
            apiKey,
            campaignName: "invoice_pdf_camp", // <-- Create this in Aisensy
            destination: cleanPhone,
            userName: "Wholesiii",
            templateParams: [], // keep empty if template has no variables
            source: "order-system",

            // MEDIA OBJECT FOR DOCUMENT
            media: {
                url: invoicePdfUrl,      // Public HTTPS PDF URL
                filename: fileName,      // What user sees in WhatsApp
                type: "document",        // Required for PDF
            },

            buttons: [],
            carouselCards: [],
            location: {},
            attributes: {},
        },
    });
}

/* =========================================================
   INVOICE LINK CAMPAIGN
   Template Example:
   "Hi {{1}}, your invoice is ready: {{2}}"
   (If your template only uses name, invoiceUrl is optional)
========================================================= */
export async function sendInvoiceLinkCampaign(
    apiKey: string,
    phone: string,
    firstName?: string,
    invoiceUrl?: string,
): Promise<Record<string, unknown>> {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const safeName = firstName && firstName.trim() ? firstName.trim() : "user";
    const templateParams = invoiceUrl ? [safeName, invoiceUrl] : [safeName];

    return aisensyRequest({
        data: {
            apiKey,
            campaignName: "invoice_link_camp",
            destination: cleanPhone,
            userName: "Wholesiii",
            templateParams,
            source: "order-system",
            media: {},
            buttons: [],
            carouselCards: [],
            location: {},
            attributes: {},
            paramsFallbackValue: {
                InvoiceUrl: invoiceUrl || "",
            },
        },
    });
}
