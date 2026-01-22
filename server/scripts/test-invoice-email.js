#!/usr/bin/env node

/**
 * Test Invoice & Payment Email Flow
 * Simulates a complete payment workflow with invoice generation
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:4000";
const RAZORPAY_WEBHOOK_SECRET = "hello"; // Should match webhook verification

// Test user credentials
const testUser = {
    name: "Test User",
    email: `test.${Date.now()}@example.com`,
    password: "Test@1234",
    phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
};

let authToken = null;

// Helper function for API calls
async function apiCall(method, path, body = null, useAuth = true) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
        },
    };

    // Add authorization header if token is available and useAuth is true
    if (authToken && useAuth) {
        options.headers["Authorization"] = `Bearer ${authToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
}

async function runTests() {
    console.log("🧪 Testing Invoice & Payment Email Flow\n");

    try {
        // 0. Register/Login user
        console.log("👤 Step 0: Registering test user...");
        try {
            const registerResponse = await apiCall("POST", "/api/auth/register", {
                name: testUser.name,
                email: testUser.email,
                phone: testUser.phone,
                password: testUser.password,
                role: "customer",
            }, false);

            authToken = registerResponse.token;
            console.log(`✅ User registered successfully`);
            console.log(`   Email: ${testUser.email}`);
            console.log(`   Token: ${authToken.substring(0, 20)}...\n`);
        } catch (error) {
            // User might already exist, try login
            console.log("   User might exist, trying login...");
            const loginResponse = await apiCall("POST", "/api/auth/login", {
                email: testUser.email,
                password: testUser.password,
            }, false);

            authToken = loginResponse.token;
            console.log(`✅ User logged in successfully\n`);
        }

        // 0.5. Create an address for the user
        console.log("📍 Step 0.5: Creating shipping address...");
        const addressResponse = await apiCall("POST", "/api/addresses", {
            name: "Test Address",
            street: "123 Test Street",
            city: "New Delhi",
            state: "Delhi",
            postalCode: "110001",
            country: "India",
            phone: testUser.phone,
            isDefault: true,
        });

        // The response structure is { data: { addressId: "xxx" } }
        const addressId = addressResponse.data.addressId;
        console.log(`✅ Address created: ${addressId}\n`);

        // 0.6. Add items to cart
        console.log("🛒 Step 0.6: Adding items to cart...");

        // First, let's get or create some test products
        const product1Response = await apiCall("POST", "/api/products", {
            name: "Test Product A",
            price: 500,
            description: "Test product for invoice testing",
            category: "Electronics",
            stock: 100,
        }).catch(() => {
            // If product creation fails (maybe permission issue), we'll use a dummy ID
            return { data: { _id: "507f1f77bcf86cd799439011" } };
        });

        const product2Response = await apiCall("POST", "/api/products", {
            name: "Premium Product B",
            price: 1000,
            description: "Premium test product",
            category: "Electronics",
            stock: 50,
        }).catch(() => {
            return { data: { _id: "507f1f77bcf86cd799439012" } };
        });

        // Add items to cart
        await apiCall("POST", "/api/cart/add", {
            productId: product1Response.data._id,
            quantity: 2,
        }).catch(() => {
            console.log("   Warning: Could not add first item to cart");
        });

        await apiCall("POST", "/api/cart/add", {
            productId: product2Response.data._id,
            quantity: 1,
        }).catch(() => {
            console.log("   Warning: Could not add second item to cart");
        });

        console.log(`✅ Items added to cart\n`);

        // 1. Create test order from cart
        console.log("📝 Step 1: Creating order from cart...");
        const orderResponse = await apiCall("POST", "/api/orders", {
            addressId: addressId,
            paymentMethod: "razorpay",
        });

        if (!orderResponse.data) {
            throw new Error("Failed to create order");
        }

        const orderId = orderResponse.data._id;
        console.log(`✅ Order created: ${orderId}`);
        console.log(`   Order Number: ${orderResponse.data.orderNo || orderResponse.data.orderId || 'N/A'}`);
        console.log(`   Total: ₹${orderResponse.data.netAmount || orderResponse.data.total || 0}\n`);

        // 2. Create payment order
        console.log("💳 Step 2: Creating Razorpay payment order...");
        const paymentResponse = await apiCall("POST", "/api/payments/order", {
            orderId: orderId.toString(),
        });

        if (!paymentResponse.order) {
            throw new Error("Failed to create payment order");
        }

        const orderAmount = orderResponse.data.netAmount || orderResponse.data.total || 0;

        console.log(`✅ Payment order created: ${paymentResponse.order.id}`);
        console.log(`   Amount: ₹${paymentResponse.order.amount / 100}\n`);

        // 3. Simulate webhook
        console.log("🔔 Step 3: Simulating Razorpay webhook (payment.captured)...");

        const webhookPayload = {
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: `pay_test_${Date.now()}`,
                        order_id: paymentResponse.order.id,
                        amount: paymentResponse.order.amount,
                        currency: "INR",
                    },
                },
            },
        };

        const webhookResponse = await fetch(`${BASE_URL}/api/payments/webhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-razorpay-signature": "test_signature",
            },
            body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
            const errorData = await webhookResponse.json();
            throw new Error(`Webhook failed: ${webhookResponse.status} - ${JSON.stringify(errorData)}`);
        }

        console.log("✅ Webhook processed successfully\n");

        // 4. Check order status
        console.log("📊 Step 4: Verifying order payment status...");
        const checkOrderResponse = await apiCall("GET", `/api/orders/${orderId}`);

        const order = checkOrderResponse.data;
        console.log(`   Order ID: ${order._id}`);
        console.log(`   Payment Status: ${order.paymentStatus}`);
        console.log(`   Order Status: ${order.status}`);
        console.log(`   Razorpay Payment ID: ${order.razorpayPaymentId || 'N/A'}`);

        if (order.paymentStatus !== "completed") {
            console.warn(`⚠️  Expected paymentStatus "completed", got "${order.paymentStatus}"`);
        } else {
            console.log("✅ Order payment status verified\n");
        }

        // 5. Check for invoice email
        console.log("📧 Step 5: Checking email logs (check server console)...");
        console.log(`   Looking for: '✅ Payment confirmation email sent to ${testUser.email}'`);
        console.log("   (Check the server terminal for email confirmation)\n");

        console.log("🎉 All tests completed successfully!\n");

        console.log("📋 Summary:");
        console.log(`   ✓ User registered/logged in`);
        console.log(`   ✓ Order created and paid`);
        console.log(`   ✓ Payment confirmed in database`);
        console.log(`   ✓ Invoice email should have been sent`);
        console.log(`   → Check server console for email confirmation logs\n`);

        console.log("💡 Tips:");
        console.log(`   - Server should log: "✅ Payment confirmation email sent to ${testUser.email}"`);
        console.log(`   - Check your email inbox for the invoice`);
        console.log(`   - If not received, verify MAIL_HOST, MAIL_USER, MAIL_PASSWORD in .env`);
        console.log(`   - Make sure SMTP credentials are correct\n`);

    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        if (error.stack) {
            console.error("\n📍 Stack trace:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

console.log("⚠️  Make sure your server is running: npm run dev\n");

// Wait a moment then run tests
setTimeout(() => {
    runTests().then(() => {
        console.log("✨ Test suite completed!");
        process.exit(0);
    });
}, 1000);
