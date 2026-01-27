import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

import { 
    checkPincodeServiceability, 
    getExpectedTat, 
    getShippingCharges 
} from '../src/utils/delhivery.js';
import { env } from '../src/config/env.js';

async function testDelhiveryAPI() {
    console.log('🧪 Testing Delhivery API Integration\n');
    
    // Display configuration
    console.log('📋 Configuration:');
    console.log('- DELHIVERY_TOKEN:', env.DELHIVERY_TOKEN ? `${env.DELHIVERY_TOKEN.substring(0, 10)}...` : '❌ NOT SET');
    console.log('- DELHIVERY_API_URL:', env.DELHIVERY_API_URL);
    console.log('- DELHIVERY_TRACK_API_URL:', env.DELHIVERY_TRACK_API_URL);
    console.log('- SELLER_PINCODE:', env.SELLER_PINCODE || '❌ NOT SET');
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 1: Check Pincode Serviceability
    console.log('TEST 1: Check Pincode Serviceability');
    console.log('-'.repeat(60));
    const testPincode = '110001'; // Delhi pincode
    try {
        console.log(`Checking pincode: ${testPincode}`);
        const result = await checkPincodeServiceability(testPincode);
        console.log('✅ Success!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Failed!');
        console.log('Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Get Expected TAT
    console.log('TEST 2: Get Expected TAT (Turnaround Time)');
    console.log('-'.repeat(60));
    const originPin = env.SELLER_PINCODE || '400001';
    const destinationPin = '110001';
    try {
        console.log(`Origin: ${originPin}`);
        console.log(`Destination: ${destinationPin}`);
        const result = await getExpectedTat({
            originPin,
            destinationPin,
        });
        console.log('✅ Success!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Failed!');
        console.log('Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Get Shipping Charges
    console.log('TEST 3: Get Shipping Charges');
    console.log('-'.repeat(60));
    try {
        console.log(`Origin: ${originPin}`);
        console.log(`Destination: ${destinationPin}`);
        console.log('Weight: 500g');
        console.log('Payment Mode: Prepaid');
        const result = await getShippingCharges({
            originPin,
            destinationPin,
            weight: 500,
            paymentMode: 'Pre-paid',
        });
        console.log('✅ Success!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Failed!');
        console.log('Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 4: Check another pincode (Mumbai)
    console.log('TEST 4: Check Mumbai Pincode Serviceability');
    console.log('-'.repeat(60));
    const mumbaiPin = '400001';
    try {
        console.log(`Checking pincode: ${mumbaiPin}`);
        const result = await checkPincodeServiceability(mumbaiPin);
        console.log('✅ Success!');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('❌ Failed!');
        console.log('Error:', error.message);
    }
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('🏁 Test complete!');
}

testDelhiveryAPI().catch(console.error);
