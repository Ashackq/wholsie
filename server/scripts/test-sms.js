// Test SMS via SMS Alert (smsalert.co.in)
import 'dotenv/config';

const apiKey = process.env.SMS_API_KEY;
const sender = process.env.SMS_SENDER_ID || 'WHLSII';
const route = process.env.SMS_ROUTE || 'transactional';
const to = process.env.TEST_SMS_TO || "7069928282";
const otp = 123456;
if (!apiKey || !to) {
    console.error('Missing SMS_API_KEY or TEST_SMS_TO in env');
    process.exit(1);
}

const url = 'https://www.smsalert.co.in/api/push.json';

const params = new URLSearchParams();
params.append('apikey', apiKey);
params.append('sender', sender);
params.append('mobileno', to);
params.append('text', `Your OTP for Login on Wholesiii is {${otp}}. This code is valid for 10 minutes. Divaine Leaf Neutra Private Limited`);
params.append('route', route);

try {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });
    const json = await res.json();
    if (!res.ok) {
        console.error('SMS Alert error:', json);
        process.exit(1);
    }
    console.log('SMS Alert response:', json);
} catch (err) {
    console.error('SMS Alert request failed:', err?.message || err);
    process.exit(1);
}
