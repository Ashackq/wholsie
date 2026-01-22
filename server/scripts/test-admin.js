// Admin end-to-end API smoke tests: login, dashboard, categories/products CRUD, orders list/status
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

async function login() {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
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
    console.log('Logging in as admin:', ADMIN_EMAIL);
    const { cookie } = await login();

    console.log('→ Dashboard');
    const dashboard = await authedFetch('/admin/dashboard', cookie);
    console.log('  dashboard ok:', JSON.stringify(dashboard));

    console.log('→ Create category');
    const catName = `Test Cat ${crypto.randomInt(1000, 9999)}`;
    const newCat = await authedFetch('/admin/categories', cookie, {
        method: 'POST',
        body: JSON.stringify({ name: catName, status: 'active' }),
    });
    const catId = newCat.data?.categoryId || newCat.data?._id || newCat.data?.id;
    if (!catId) throw new Error('Category creation did not return id');

    console.log('→ Update category');
    await authedFetch(`/admin/categories/${catId}`, cookie, {
        method: 'PUT',
        body: JSON.stringify({ name: `${catName}-updated`, status: 'active' }),
    });

    console.log('→ Create product');
    const prodName = `Test Prod ${crypto.randomInt(1000, 9999)}`;
    const newProd = await authedFetch('/admin/products', cookie, {
        method: 'POST',
        body: JSON.stringify({
            name: prodName,
            basePrice: 100,
            salePrice: 90,
            stock: 10,
            categoryId: catId,
            status: 'active',
        }),
    });
    const prodId = newProd.data?.productId || newProd.data?._id || newProd.data?.id;
    if (!prodId) throw new Error('Product creation did not return id');

    console.log('→ Update product');
    await authedFetch(`/admin/products/${prodId}`, cookie, {
        method: 'PUT',
        body: JSON.stringify({ name: `${prodName}-updated`, stock: 5, status: 'active' }),
    });

    console.log('→ Delete product');
    await authedFetch(`/admin/products/${prodId}`, cookie, { method: 'DELETE' });

    console.log('→ Delete category');
    await authedFetch(`/admin/categories/${catId}`, cookie, { method: 'DELETE' });

    console.log('→ List orders');
    const orders = await authedFetch('/admin/orders', cookie, { method: 'GET' });
    console.log(`  orders found: ${orders.data?.length ?? 0}`);
    const firstOrder = orders.data?.[0];
    if (firstOrder?._id) {
        console.log('→ Update first order status');
        await authedFetch(`/admin/orders/${firstOrder._id}/status`, cookie, {
            method: 'PUT',
            body: JSON.stringify({ status: 'pending' }),
        });
    }

    console.log('✅ Admin API test passed');
}

run().catch((err) => {
    console.error('❌ Admin API test failed:', err.message || err);
    process.exit(1);
});
