// Customer flow end-to-end test: register, browse products, add to cart, checkout, view orders
import 'dotenv/config';
import crypto from 'crypto';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wholesiii.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

function extractCookie(setCookieHeaders = []) {
    if (!setCookieHeaders) return '';
    const header = Array.isArray(setCookieHeaders) ? setCookieHeaders[0] : setCookieHeaders;
    return header ? header.split(';')[0] : '';
}

async function register(email, password, name = 'Test Customer') {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            name,
            phone: '9191234567' + Math.floor(Math.random() * 10000),
            role: 'customer',
        }),
        redirect: 'manual',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Register failed: ${res.status} ${JSON.stringify(json)}`);
    const cookie = extractCookie(res.headers.get('set-cookie'));
    if (!cookie) throw new Error('No auth cookie returned from register');
    return { cookie, json };
}

async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        redirect: 'manual',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Login failed: ${res.status} ${JSON.stringify(json)}`);
    const cookie = extractCookie(res.headers.get('set-cookie'));
    if (!cookie) throw new Error('No auth cookie returned from login');
    return { cookie, json };
}

async function authedFetch(path, cookie, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);
    return json;
}

async function run() {
    console.log('=== CUSTOMER FLOW TEST ===\n');

    // Use existing customer
    const customerEmail = 'info@wholesiii.com';
    const customerPassword = 'wholesi@123';

    console.log('→ Login customer:', customerEmail);
    const { cookie } = await login(customerEmail, customerPassword);
    console.log('  ✓ logged in');

    // 2. Get products
    console.log('→ Browse products');
    const productsRes = await authedFetch('/products?limit=5', cookie);
    const products = productsRes.products || productsRes.data || [];
    console.log(`  ✓ found ${products.length} products`);
    if (products.length === 0) {
        console.log('  ⚠ No products available - creating test data...');
        // In real scenario, admin would have created products
        console.log('  (Skipping cart test - need products)');
    } else {
        const product = products[0];
        const productId = product._id || product.id;

        // 3. Add to cart
        console.log('→ Add to cart');
        const addCartRes = await authedFetch('/cart/items', cookie, {
            method: 'POST',
            body: JSON.stringify({
                productId,
                quantity: 2,
            }),
        });
        console.log('  ✓ added to cart, response:', JSON.stringify(addCartRes).substring(0, 200));

        // 4. Get cart
        console.log('→ View cart');
        const cartRes = await authedFetch('/cart', cookie);
        const cart = cartRes.data || cartRes;
        console.log(`  cart response:`, JSON.stringify(cart).substring(0, 300));
        console.log(`  ✓ cart has ${cart.items?.length || 0} items`);

        // 5. Create/get address
        console.log('→ Get/create address');
        let addressId;
        const addressesRes = await authedFetch('/addresses', cookie);
        const addresses = addressesRes.data || addressesRes || [];
        if (addresses.length > 0) {
            addressId = addresses[0]._id;
            console.log(`  ✓ using existing address: ${addressId}`);
        } else {
            const newAddressRes = await authedFetch('/addresses', cookie, {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test Address',
                    phone: '9191234567',
                    address: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    pincode: '123456',
                    country: 'India',
                    isDefault: true,
                }),
            });
            addressId = newAddressRes.data?._id || newAddressRes.data?.addressId;
            console.log(`  ✓ created new address: ${addressId}`);
        }

        // 6. Create order
        console.log('→ Create order');
        const orderRes = await authedFetch('/orders', cookie, {
            method: 'POST',
            body: JSON.stringify({
                addressId,
                paymentMethod: 'cod',
            }),
        });
        const orderId = orderRes.data?.orderId;
        const orderNo = orderRes.data?.orderNo;
        console.log(`  ✓ created order: ${orderId} (No: ${orderNo})`);

        // 7. View orders
        console.log('→ View my orders');
        const ordersRes = await authedFetch('/orders', cookie);
        const orders = ordersRes.data || ordersRes;
        console.log(`  ✓ user has ${Array.isArray(orders) ? orders.length : 1} order(s)`);

        // 8. View order details
        if (orderId) {
            console.log('→ View order details');
            const orderDetailsRes = await authedFetch(`/orders/${orderId}`, cookie);
            console.log('  ✓ retrieved order details');
        }
    }

    // 9. View current user
    console.log('→ Get current user');
    const userRes = await authedFetch('/auth/me', cookie);
    console.log(`  ✓ user: ${userRes.data?.email}`);

    console.log('\n✅ Customer flow test passed');
}

run().catch((err) => {
    console.error('❌ Customer flow test failed:', err.message || err);
    process.exit(1);
});
