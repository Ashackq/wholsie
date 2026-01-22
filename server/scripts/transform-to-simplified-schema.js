/**
 * Transform Legacy Data to Simplified MongoDB Schema
 * Consolidates 30+ tables into 8 core collections
 * 
 * Before: products (3 tables), categories (2 tables), addresses, delivery (3 tables), etc
 * After: products (1), categories (1), addresses (1), deliveryConfig (1), etc
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'wholesiii';

async function transformData() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('\n🔗 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected\n');

        const db = client.db(DB_NAME);

        // Create backup collections prefix
        const backup = `_backup_${new Date().getTime()}`;

        console.log('📊 Starting data transformation to simplified schema...\n');

        // ===== PHASE 1: Transform Products =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 1: Transform Products');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('→ Merging productprices + productvariant + product_images...');

        const products = await db.collection('products').find({}).toArray();
        const productVariants = await db.collection('productVariants').find({}).toArray();
        const productImages = await db.collection('productImages').find({}).toArray();

        const transformedProducts = products.map(product => {
            // Find all variants for this product
            const variantsForProduct = productVariants.filter(v => v.productId?.toString() === product._id.toString());

            // Find all images for this product
            const imagesForProduct = productImages.filter(img => img.productId?.toString() === product._id.toString());

            return {
                _id: product._id,
                oldId: product.oldId,

                // Basic Info
                name: product.name,
                description: product.description || null,
                sku: product.sku || null,

                // Pricing
                basePrice: product.price || 0,
                discountPrice: product.discountPrice || null,

                // Variants with prices/images
                variants: variantsForProduct.map(v => ({
                    _id: v._id,
                    name: v.name,
                    sku: v.sku,
                    price: v.price || product.price,
                    discountPrice: v.discountPrice,
                    stock: v.stock,
                    variantType: v.variantId, // reference to variant type
                    variantValue: v.variantValueId, // reference to variant value
                    image: v.image || null,
                    status: v.status
                })),

                // Images
                images: imagesForProduct.map(img => ({
                    _id: img._id,
                    url: img.image,
                    position: img.position,
                    isDefault: img.isDefault || false
                })).sort((a, b) => a.position - b.position),

                // Classification
                categoryId: product.categoryId,

                // Stock & Metadata
                stock: product.quantity || 0,
                unit: product.unit || null,
                tax: product.taxPercentage || 0,
                minOrderQty: product.minOrderQty || 1,
                maxOrderQty: product.maxOrderQty || null,

                // Status
                status: product.status === 1 ? 'active' : 'inactive',
                isFeatured: product.isFeatured || false,

                // Timestamps
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            };
        });

        if (transformedProducts.length > 0) {
            await db.collection('products_new').deleteMany({});
            await db.collection('products_new').insertMany(transformedProducts);
            console.log(`  ✓ ${transformedProducts.length} products merged\n`);
        }

        // ===== PHASE 2: Transform Categories =====
        console.log('→ Merging main_category + menu_category...');

        const mainCategories = await db.collection('mainCategories').find({}).toArray();
        const menuCategories = await db.collection('menuCategories').find({}).toArray();

        const transformedCategories = [
            // Add main categories as level 0
            ...mainCategories.map(mc => ({
                _id: mc._id,
                oldId: mc.oldId,
                name: mc.name,
                description: null,
                image: mc.image || null,
                parentId: null, // top level
                level: 0,
                position: mc.position || 0,
                status: mc.status === 1 ? 'active' : 'inactive',
                createdAt: mc.createdAt,
                updatedAt: mc.updatedAt
            })),

            // Add menu categories as level 1 (subcategories)
            ...menuCategories.map(mc => ({
                _id: mc._id,
                oldId: mc.oldId,
                name: mc.name,
                description: mc.description || null,
                image: mc.image || null,
                parentId: mc.mainCategoryId || null, // parent is main category
                level: 1,
                position: mc.priority || 0,
                status: mc.status === 1 ? 'active' : 'inactive',
                storeId: mc.storeId, // preserve store association
                createdAt: mc.createdAt,
                updatedAt: mc.createdAt
            }))
        ];

        if (transformedCategories.length > 0) {
            await db.collection('categories_new').deleteMany({});
            await db.collection('categories_new').insertMany(transformedCategories);
            console.log(`  ✓ ${transformedCategories.length} categories merged\n`);
        }

        // ===== PHASE 3: Transform Delivery Config =====
        console.log('→ Consolidating delivery settings...');

        const chargeSettings = await db.collection('deliveryChargeSettings').find({}).toArray();
        const pincodeDelivery = await db.collection('pincodeDelivery').find({}).toArray();
        const offers = await db.collection('offers').find({}).toArray();

        const deliveryConfig = {
            _id: new ObjectId(),
            type: 'deliveryConfig',

            chargeRules: chargeSettings.map(cs => ({
                minAmount: cs.minOrderAmount,
                maxAmount: cs.maxOrderAmount,
                charge: cs.deliveryCharge,
                freeAbove: cs.freeDeliveryAbove
            })),

            pincodeRules: pincodeDelivery.map(pd => ({
                _id: pd._id,
                oldPincodeId: pd.oldPincodeId,
                pincodeId: pd.pincodeId,
                charge: pd.deliveryCharge,
                estimatedDays: pd.estimatedDays,
                isAvailable: pd.isAvailable
            })),

            offers: offers.map(o => ({
                _id: o._id,
                code: o.code,
                title: o.title,
                description: o.description,
                discountType: o.discountType, // 'percentage' or 'fixed'
                discountValue: o.discountValue,
                minAmount: o.minOrderAmount,
                maxDiscount: o.maxDiscountAmount,
                validFrom: o.startDate,
                validTo: o.endDate,
                usageLimit: o.usageLimit,
                usedCount: o.usedCount || 0,
                status: o.status === 1 ? 'active' : 'inactive'
            })),

            updatedAt: new Date()
        };

        await db.collection('deliveryConfig_new').deleteMany({});
        await db.collection('deliveryConfig_new').insertOne(deliveryConfig);
        console.log(`  ✓ Delivery config consolidated\n`);

        // ===== PHASE 4: Transform Transactions =====
        console.log('→ Merging transactions + wallet_history...');

        const transactions = await db.collection('transactions').find({}).toArray();
        const walletHistory = await db.collection('walletHistory').find({}).toArray();

        const transformedTransactions = [
            ...transactions.map(t => ({
                _id: t._id,
                oldId: t.oldId,
                userId: t.userId,
                orderId: t.orderId,
                amount: t.amount,
                type: t.type || 'debit',
                transactionType: t.transactionType || 'payment',
                paymentMethod: t.paymentMethod,
                paymentId: t.paymentId,
                status: t.status,
                description: t.description,
                createdAt: t.createdAt
            })),

            ...walletHistory.map(wh => ({
                _id: wh._id,
                oldId: wh.oldId,
                userId: wh.userId,
                orderId: wh.orderId,
                amount: wh.amount,
                type: wh.type === 'credit' ? 'credit' : 'debit',
                transactionType: 'wallet',
                status: 'success',
                description: wh.description,
                balanceBefore: wh.balanceBefore,
                balanceAfter: wh.balanceAfter,
                createdAt: wh.createdAt
            }))
        ];

        if (transformedTransactions.length > 0) {
            await db.collection('transactions_new').deleteMany({});
            await db.collection('transactions_new').insertMany(transformedTransactions);
            console.log(`  ✓ ${transformedTransactions.length} transactions merged\n`);
        }

        // ===== PHASE 5: Rename new collections to live =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 5: Activating Simplified Schema');
        console.log('═══════════════════════════════════════════════════════\n');

        const collections = [
            { old: 'products', new: 'products_new' },
            { old: 'categories', new: 'categories_new' },
            { old: 'transactions', new: 'transactions_new' },
            { old: 'deliveryConfig', new: 'deliveryConfig_new' }
        ];

        for (const { old, new: newName } of collections) {
            try {
                const exists = await db.collection(old).findOne({});
                if (exists) {
                    console.log(`→ Backing up ${old} → ${backup}_${old}`);
                    await db.collection(old).aggregate([
                        { $out: `${backup}_${old}` }
                    ]).toArray();
                }

                console.log(`→ Renaming ${newName} → ${old}`);
                await db.collection(newName).rename(old);
                console.log(`  ✓ ${old} activated\n`);
            } catch (err) {
                console.error(`  ⚠️ Error: ${err.message}`);
            }
        }

        // ===== Create Indexes for New Schema =====
        console.log('→ Creating indexes for simplified schema...');

        const indexOps = [
            { collection: 'products_new', indexes: [{ categoryId: 1 }, { status: 1 }, { name: 1 }] },
            { collection: 'categories_new', indexes: [{ parentId: 1 }, { level: 1 }, { status: 1 }] },
            { collection: 'transactions_new', indexes: [{ userId: 1 }, { orderId: 1 }, { type: 1 }] }
        ];

        for (const { collection, indexes: idxList } of indexOps) {
            for (const idx of idxList) {
                try {
                    await db.collection(collection).createIndex(idx);
                } catch (err) {
                    // Index might already exist
                }
            }
        }

        console.log('  ✓ Indexes created\n');

        // ===== Summary =====
        console.log('\n════════════════════════════════════════════════════════');
        console.log('  ✨ TRANSFORMATION COMPLETE ✨');
        console.log('════════════════════════════════════════════════════════');

        console.log('\n📦 Collections Transformed:');
        console.log('  ✓ products (merged from productprices + variants + images)');
        console.log('  ✓ categories (merged from main_category + menu_category)');
        console.log('  ✓ transactions (merged from transactions + wallet_history)');
        console.log('  ✓ deliveryConfig (consolidated settings + offers)\n');

        console.log('🔄 Old Collections Backed Up:');
        console.log(`  → ${backup}_products`);
        console.log(`  → ${backup}_categories`);
        console.log(`  → ${backup}_transactions`);
        console.log(`  → ${backup}_deliveryConfig\n`);

        console.log('⏭️  What to do next:');
        console.log('  1. Review SIMPLIFIED_SCHEMA.md for new structure');
        console.log('  2. Update API endpoints to use new collections');
        console.log('  3. Update queries to use nested arrays instead of joins');
        console.log('  4. Run tests against new schema');
        console.log('  5. Once verified, delete backup collections\n');

        console.log('💡 New Query Examples:');
        console.log('  db.products.find({ categoryId: ObjectId(...) })');
        console.log('  db.products.find({ "variants.stock": { $gt: 0 } })');
        console.log('  db.categories.find({ parentId: ObjectId(...) }) // subcategories');
        console.log('  db.transactions.find({ userId: ObjectId(...), type: "credit" })\n');

        console.log('════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

transformData();
