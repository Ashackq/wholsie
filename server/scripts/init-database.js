/**
 * Database Initialization Script
 * Creates indexes and initializes required collections for the Wholesii API
 * 
 * Run with: node scripts/init-database.js
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wholesiii';
const DB_NAME = 'wholesiii';

async function initializeDatabase() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');

        const db = client.db(DB_NAME);

        // Create collections
        console.log('\n📋 Creating collections...');
        const collections = [
            'products',
            'categories',
            'orders',
            'carts',
            'users',
            'addresses',
            'transactions',
            'deliveryConfig',
            'reviews',
            'wishlists',
            'notifications'
        ];

        for (const collName of collections) {
            try {
                const coll = await db.createCollection(collName);
                console.log(`  ✓ Created ${collName}`);
            } catch (err: any) {
                if (err.codeName === 'NamespaceExists') {
                    console.log(`  ℹ ${collName} already exists`);
                } else {
                    throw err;
                }
            }
        }

        // Create indexes
        console.log('\n📑 Creating indexes...');

        // Products indexes
        await db.collection('products').createIndex({ status: 1 });
        await db.collection('products').createIndex({ categoryId: 1 });
        await db.collection('products').createIndex({ name: 'text', description: 'text' });
        await db.collection('products').createIndex({ slug: 1 }, { unique: true });
        console.log('  ✓ Products indexes created');

        // Categories indexes
        await db.collection('categories').createIndex({ parentId: 1 });
        await db.collection('categories').createIndex({ level: 1 });
        await db.collection('categories').createIndex({ status: 1 });
        console.log('  ✓ Categories indexes created');

        // Orders indexes
        await db.collection('orders').createIndex({ userId: 1 });
        await db.collection('orders').createIndex({ riderId: 1 });
        await db.collection('orders').createIndex({ status: 1 });
        await db.collection('orders').createIndex({ orderNo: 1 }, { unique: true });
        await db.collection('orders').createIndex({ createdAt: -1 });
        console.log('  ✓ Orders indexes created');

        // Carts indexes
        await db.collection('carts').createIndex({ userId: 1 }, { unique: true });
        console.log('  ✓ Carts indexes created');

        // Users indexes
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ phone: 1 }, { unique: true });
        await db.collection('users').createIndex({ role: 1 });
        await db.collection('users').createIndex({ status: 1 });
        console.log('  ✓ Users indexes created');

        // Addresses indexes
        await db.collection('addresses').createIndex({ userId: 1 });
        console.log('  ✓ Addresses indexes created');

        // Transactions indexes
        await db.collection('transactions').createIndex({ userId: 1 });
        await db.collection('transactions').createIndex({ orderId: 1 });
        await db.collection('transactions').createIndex({ createdAt: -1 });
        console.log('  ✓ Transactions indexes created');

        // Reviews indexes
        await db.collection('reviews').createIndex({ productId: 1 });
        await db.collection('reviews').createIndex({ userId: 1 });
        await db.collection('reviews').createIndex({ createdAt: -1 });
        console.log('  ✓ Reviews indexes created');

        // Wishlists indexes
        await db.collection('wishlists').createIndex({ userId: 1 });
        await db.collection('wishlists').createIndex({ productId: 1 });
        console.log('  ✓ Wishlists indexes created');

        // Notifications indexes
        await db.collection('notifications').createIndex({ userId: 1 });
        await db.collection('notifications').createIndex({ createdAt: -1 });
        console.log('  ✓ Notifications indexes created');

        // Initialize deliveryConfig if not exists
        console.log('\n⚙️  Initializing DeliveryConfig...');
        const deliveryConfig = await db.collection('deliveryConfig').findOne({});
        if (!deliveryConfig) {
            const defaultConfig = {
                chargeRules: [
                    { minAmount: 0, maxAmount: 500, charge: 50 },
                    { minAmount: 501, maxAmount: 1000, charge: 30 },
                    { minAmount: 1001, maxAmount: null, charge: 0 }
                ],
                offers: [
                    {
                        code: 'WELCOME10',
                        discountType: 'percentage',
                        discountValue: 10,
                        maxDiscount: 500,
                        minAmount: 100,
                        maxUses: 1000,
                        usedCount: 0,
                        status: 'active',
                        startDate: new Date('2024-01-01'),
                        endDate: null
                    }
                ],
                updatedAt: new Date()
            };

            await db.collection('deliveryConfig').insertOne(defaultConfig);
            console.log('  ✓ Default delivery config created');
        } else {
            console.log('  ℹ Delivery config already exists');
        }

        console.log('\n✅ Database initialization complete!');
        console.log('\nIndexes created for:');
        console.log('  - Text search on products (name, description)');
        console.log('  - User queries (email, phone, role)');
        console.log('  - Order queries (userId, riderId, status)');
        console.log('  - Category hierarchy (parentId, level)');
        console.log('  - Time-based queries (createdAt)');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run initialization
initializeDatabase().catch(console.error);
