import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:4000/api';

async function testShippingEndpoint() {
    console.log('🧪 Testing Shipping Calculator Endpoint\n');
    console.log('='.repeat(60) + '\n');

    // Test 1: Shipping for cart below ₹500
    console.log('TEST 1: Cart below ₹500 (should calculate shipping)');
    console.log('-'.repeat(60));
    try {
        const response = await fetch(`${API_BASE}/shipping/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                destinationPin: '110001',
                cartTotal: 350,
                items: [
                    { productId: 'test123', quantity: 2 },
                    { productId: 'test456', quantity: 1 },
                ],
            }),
        });

        const result = await response.json();
        console.log('✅ Response:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Free shipping for cart above ₹500
    console.log('TEST 2: Cart above ₹500 (should be free shipping)');
    console.log('-'.repeat(60));
    try {
        const response = await fetch(`${API_BASE}/shipping/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                destinationPin: '110001',
                cartTotal: 750,
                items: [
                    { productId: 'test123', quantity: 5 },
                ],
            }),
        });

        const result = await response.json();
        console.log('✅ Response:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Missing pincode
    console.log('TEST 3: Missing destination pincode (should error)');
    console.log('-'.repeat(60));
    try {
        const response = await fetch(`${API_BASE}/shipping/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cartTotal: 350,
                items: [],
            }),
        });

        const result = await response.json();
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 4: Check pincode serviceability
    console.log('TEST 4: Check Pincode Serviceability');
    console.log('-'.repeat(60));
    try {
        const response = await fetch(`${API_BASE}/delhivery/check-pincode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pincode: '110001',
            }),
        });

        const result = await response.json();
        console.log('✅ Response:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('🏁 All tests complete!');
    console.log('\n💡 Note: Make sure your server is running on port 4000');
}

testShippingEndpoint().catch(console.error);
