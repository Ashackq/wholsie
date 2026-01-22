// Test AiSensy API (WhatsApp). Requires API URL and Key. Payload may vary per account.
import 'dotenv/config';

const url = process.env.AISENSY_API_URL; // e.g., https://backend.aisensy.com/campaign/api
const apiKey = process.env.AISENSY_API_KEY; // Bearer token or API key
const phone = process.env.AISENSY_PHONE; // recipient phone with country code, e.g. 91XXXXXXXXXX
const templateId = process.env.AISENSY_TEMPLATE_ID; // your template/campaign identifier

if (!url || !apiKey || !phone || !templateId) {
    console.error('Missing AISENSY_* env vars');
    process.exit(1);
}

// Example minimal payload; adjust fields per your AiSensy workspace
const payload = {
    phone: phone,
    template_id: templateId,
    params: {
        name: 'Wholesii Tester',
        time: new Date().toLocaleString(),
    }
};

try {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error('AiSensy error:', json);
        process.exit(1);
    }
    console.log('AiSensy message accepted:', json || '[no body]');
} catch (err) {
    console.error('AiSensy request failed:', err?.message || err);
    process.exit(1);
}
