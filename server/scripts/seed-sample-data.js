/**
 * Sample Data Script for Testing
 * Populates database with sample data for testing the API
 * 
 * Run with: node scripts/seed-sample-data.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wholesiii';
const DB_NAME = 'wholesiii';

async function seedData() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');

        const db = client.db(DB_NAME);

        // Clear existing data (optional)
        console.log('\n🗑️  Clearing sample data...');
        // Uncomment to clear:
        // await db.collection('products').deleteMany({ createdBy: 'seed' });
        // await db.collection('categories').deleteMany({ createdBy: 'seed' });
        // etc.

        console.log('\n👥 Creating sample users...');

        // Admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminResult = await db.collection('users').insertOne({
            name: 'Admin User',
            email: 'admin@wholesii.com',
            phone: '9000000001',
            password: adminPassword,
            role: 'admin',
            status: 'active',
            wallet: { balance: 0, reserved: 0 },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Admin user: admin@wholesii.com / admin123`);

        // Customer user
        const customerPassword = await bcrypt.hash('customer123', 10);
        const customerResult = await db.collection('users').insertOne({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '9876543210',
            password: customerPassword,
            role: 'customer',
            status: 'active',
            wallet: { balance: 500, reserved: 0 },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Customer user: john@example.com / customer123`);

        // Rider user
        const riderPassword = await bcrypt.hash('rider123', 10);
        const riderResult = await db.collection('users').insertOne({
            name: 'Rajesh Kumar',
            email: 'rider@example.com',
            phone: '9876543211',
            password: riderPassword,
            role: 'rider',
            status: 'active',
            rating: 4.5,
            deliveries: 45,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Rider user: rider@example.com / rider123`);

        console.log('\n📁 Creating sample categories...');

        // Main categories
        const electronicsResult = await db.collection('categories').insertOne({
            name: 'Electronics',
            image: 'https://via.placeholder.com/300?text=Electronics',
            parentId: null,
            level: 0,
            position: 1,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });

        // Subcategories
        const phonesResult = await db.collection('categories').insertOne({
            name: 'Phones',
            image: 'https://via.placeholder.com/300?text=Phones',
            parentId: electronicsResult.insertedId,
            level: 1,
            position: 1,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });

        const laptopsResult = await db.collection('categories').insertOne({
            name: 'Laptops',
            image: 'https://via.placeholder.com/300?text=Laptops',
            parentId: electronicsResult.insertedId,
            level: 1,
            position: 2,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });

        console.log(`  ✓ Electronics category created`);
        console.log(`  ✓ Phones subcategory created`);
        console.log(`  ✓ Laptops subcategory created`);

        console.log('\n📦 Creating sample products...');

        const products = [
            {
                name: 'iPhone 15 Pro',
                description: 'Latest iPhone with advanced camera system',
                basePrice: 99999,
                salePrice: 89999,
                discount: 10,
                tax: 5,
                stock: 50,
                categoryId: phonesResult.insertedId,
                images: [
                    'https://via.placeholder.com/400?text=iPhone+15+Pro+1',
                    'https://via.placeholder.com/400?text=iPhone+15+Pro+2'
                ],
                variants: [
                    { _id: new ObjectId(), name: '256GB', price: 89999, stock: 30 },
                    { _id: new ObjectId(), name: '512GB', price: 99999, stock: 20 }
                ],
                rating: 4.5,
                reviews: 120,
                slug: 'iphone-15-pro',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'seed'
            },
            {
                name: 'Samsung Galaxy S24',
                description: 'Flagship Samsung phone with excellent display',
                basePrice: 79999,
                salePrice: 69999,
                discount: 12,
                tax: 5,
                stock: 40,
                categoryId: phonesResult.insertedId,
                images: [
                    'https://via.placeholder.com/400?text=Galaxy+S24+1',
                    'https://via.placeholder.com/400?text=Galaxy+S24+2'
                ],
                variants: [
                    { _id: new ObjectId(), name: '128GB', price: 69999, stock: 25 },
                    { _id: new ObjectId(), name: '256GB', price: 79999, stock: 15 }
                ],
                rating: 4.3,
                reviews: 98,
                slug: 'samsung-galaxy-s24',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'seed'
            },
            {
                name: 'MacBook Pro 16',
                description: 'Powerful laptop for professionals',
                basePrice: 199999,
                salePrice: 179999,
                discount: 10,
                tax: 5,
                stock: 20,
                categoryId: laptopsResult.insertedId,
                images: [
                    'https://via.placeholder.com/400?text=MacBook+Pro+1',
                    'https://via.placeholder.com/400?text=MacBook+Pro+2'
                ],
                variants: [
                    { _id: new ObjectId(), name: 'M3 Max', price: 179999, stock: 10 },
                    { _id: new ObjectId(), name: 'M3 Pro', price: 149999, stock: 10 }
                ],
                rating: 4.8,
                reviews: 200,
                slug: 'macbook-pro-16',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'seed'
            }
        ];

        const insertResult = await db.collection('products').insertMany(products);
        const productIds = Object.values(insertResult.insertedIds);
        console.log(`  ✓ ${productIds.length} sample products created`);

        console.log('\n📍 Creating sample addresses...');

        const addressResult = await db.collection('addresses').insertOne({
            userId: customerResult.insertedId,
            address: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            state: 'NY',
            pincode: '10001',
            landmark: 'Near Central Park',
            latitude: 40.7128,
            longitude: -74.0060,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Sample address created`);

        console.log('\n🛒 Creating sample cart...');

        const cartResult = await db.collection('carts').insertOne({
            userId: customerResult.insertedId,
            items: [
                {
                    _id: new ObjectId(),
                    productId: productIds[0],
                    variantIndex: 0,
                    quantity: 1,
                    addedAt: new Date()
                }
            ],
            totalItems: 1,
            estimatedTotal: 89999,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Sample cart created`);

        console.log('\n📋 Creating sample order...');

        const orderResult = await db.collection('orders').insertOne({
            userId: customerResult.insertedId,
            customerId: customerResult.insertedId,
            customerName: 'John Doe',
            customerPhone: '9876543210',
            customerEmail: 'john@example.com',
            orderNo: `ORD-${Date.now()}`,
            items: [
                {
                    productId: productIds[0],
                    variantId: products[0].variants[0]._id,
                    name: 'iPhone 15 Pro',
                    quantity: 1,
                    price: 89999,
                    total: 89999,
                    tax: 4500
                }
            ],
            subtotal: 89999,
            taxAmount: 4500,
            deliveryCharge: 30,
            couponCode: null,
            couponAmount: 0,
            netAmount: 94529,
            addressId: addressResult.insertedId,
            deliveryAddress: '123 Main Street, Apt 4B',
            deliveryCity: 'New York',
            deliveryState: 'NY',
            deliveryPincode: '10001',
            paymentMethod: 'card',
            paymentStatus: 'completed',
            status: 'pending',
            riderId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Sample order created: ${orderResult.insertedId}`);

        console.log('\n⭐ Creating sample reviews...');

        const reviewResult = await db.collection('reviews').insertOne({
            productId: productIds[0],
            userId: customerResult.insertedId,
            rating: 5,
            review: 'Excellent product! Very satisfied with the quality and delivery.',
            status: 'active',
            createdAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Sample review created`);

        console.log('\n💳 Creating sample transactions...');

        const transactionResult = await db.collection('transactions').insertOne({
            userId: customerResult.insertedId,
            orderId: orderResult.insertedId,
            transactionType: 'debit',
            amount: 94529,
            paymentMethod: 'card',
            status: 'completed',
            description: 'Payment for order',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Sample transaction created`);

        console.log('\n❤️  Creating sample wishlist...');

        const wishlistResult = await db.collection('wishlists').insertOne({
            userId: customerResult.insertedId,
            productId: productIds[1],
            createdAt: new Date(),
            createdBy: 'seed'
        });
        console.log(`  ✓ Sample wishlist item created`);

        console.log('\n✅ Sample data seeded successfully!');
        console.log('\n📝 Test Credentials:');
        console.log('━'.repeat(50));
        console.log('Admin:');
        console.log('  Email: admin@wholesii.com');
        console.log('  Password: admin123');
        console.log('\nCustomer:');
        console.log('  Email: john@example.com');
        console.log('  Password: customer123');
        console.log('\nRider:');
        console.log('  Email: rider@example.com');
        console.log('  Password: rider123');
        console.log('━'.repeat(50));

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run seeding
seedData().catch(console.error);
