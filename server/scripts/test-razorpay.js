// Test Razorpay order creation
import Razorpay from 'razorpay';
import 'dotenv/config';
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
    console.error('Missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in env');
    process.exit(1);
}

const instance = new Razorpay({ key_id, key_secret });

try {
    const order = await instance.orders.create({
        amount: 100 * 100, // INR 100 in paise
        currency: 'INR',
        receipt: 'TEST_' + Date.now(),
        notes: { purpose: 'SDK test' },
    });
    console.log('Created Razorpay order:', order.id, order);
} catch (err) {
    console.error('Razorpay order creation failed:', err?.message || err);
    process.exit(1);
}
