/**
 * Complete Legacy Data Migration Script
 * Imports ALL 51 tables from wholesiii_old.json into MongoDB
 * Uses MongoDB-generated ObjectIds with ID mapping for relationships
 */

import fs from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'wholesiii';

// Global ID mapping: oldId -> new ObjectId
const idMaps = {};

// Helper to get or create ObjectId for old ID
function getObjectId(tableName, oldId) {
    if (!oldId || oldId === '0' || oldId === '') return null;

    if (!idMaps[tableName]) {
        idMaps[tableName] = new Map();
    }

    const key = String(oldId);
    if (!idMaps[tableName].has(key)) {
        idMaps[tableName].set(key, new ObjectId());
    }

    return idMaps[tableName].get(key);
}

// Helper to parse numeric values
function parseNum(val, defaultVal = 0) {
    if (val === null || val === undefined || val === '') return defaultVal;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? defaultVal : parsed;
}

function parseInt32(val, defaultVal = 0) {
    if (val === null || val === undefined || val === '') return defaultVal;
    const parsed = parseInt(val);
    return isNaN(parsed) ? defaultVal : parsed;
}

// Helper to parse dates
function parseDate(dateStr) {
    if (!dateStr || dateStr === '0000-00-00 00:00:00' || dateStr === '0000-00-00') {
        return new Date();
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
}

// Helper function to insert data with ID mapping
async function insertTable(collection, data, transformFn = null) {
    if (!data || data.length === 0) return 0;

    const transformed = transformFn ? data.map(transformFn).filter(x => x !== null) : data;
    if (transformed.length === 0) return 0;

    try {
        const result = await collection.insertMany(transformed, { ordered: false });
        return result.insertedCount;
    } catch (err) {
        console.error(`  ⚠️ Error inserting: ${err.message}`);
        return err.result?.insertedCount || 0;
    }
}

// Helper to create indexes for relationships
async function createIndexes(db) {
    const indexes = [
        { collection: 'users', indexes: [{ email: 1 }, { phone: 1 }] },
        { collection: 'orders', indexes: [{ userId: 1 }, { customerId: 1 }, { orderNo: 1 }] },
        { collection: 'orderItems', indexes: [{ orderId: 1 }, { productId: 1 }] },
        { collection: 'carts', indexes: [{ userId: 1 }, { productId: 1 }] },
        { collection: 'products', indexes: [{ name: 1 }, { categoryId: 1 }] },
        { collection: 'productVariants', indexes: [{ productId: 1 }] },
        { collection: 'productImages', indexes: [{ productId: 1 }] },
        { collection: 'customerAddresses', indexes: [{ userId: 1 }] },
        { collection: 'wishlists', indexes: [{ userId: 1 }, { productId: 1 }] },
        { collection: 'transactions', indexes: [{ userId: 1 }, { orderId: 1 }] },
        { collection: 'cities', indexes: [{ stateId: 1 }, { name: 1 }] },
        { collection: 'provinces', indexes: [{ countryId: 1 }, { name: 1 }] },
        { collection: 'pincodes', indexes: [{ pincode: 1 }] },
    ];

    for (const { collection, indexes: idxList } of indexes) {
        for (const idx of idxList) {
            try {
                await db.collection(collection).createIndex(idx);
            } catch (err) {
                // Index might already exist
            }
        }
    }
    console.log('✅ Indexes created\n');
}


async function seedLegacyData() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('\n🔗 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected\n');

        const db = client.db(DB_NAME);

        const legacyPath = path.join(process.cwd(), '../../wholesiii_old.json');

        if (!fs.existsSync(legacyPath)) {
            console.error('❌ Legacy data file not found at:', legacyPath);
            return;
        }

        console.log('📂 Reading legacy data...');
        const fileContent = fs.readFileSync(legacyPath, 'utf-8');
        const legacyData = JSON.parse(fileContent);

        // Extract all tables
        const tables = {};
        for (const item of legacyData) {
            if (item.type === 'table') {
                tables[item.name] = item.data || [];
                console.log(`  Found table: ${item.name} (${item.data?.length || 0} rows)`);
            }
        }

        console.log(`\n📊 Total tables found: ${Object.keys(tables).length}\n`);

        // Create indexes first
        await createIndexes(db);

        const counts = {};

        // ===== PHASE 1: Independent tables (no foreign keys) =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 1: Base Tables (Countries, States, Cities)');
        console.log('═══════════════════════════════════════════════════════\n');

        // Countries
        if (tables.country?.length > 0) {
            console.log('--- Importing Countries ---');
            counts.countries = await insertTable(db.collection('countries'), tables.country, c => ({
                _id: getObjectId('country', c.id),
                oldId: c.id,
                name: c.name,
                code: c.code || null,
                sortname: c.sortname || null,
                phonecode: c.phonecode ? parseInt32(c.phonecode) : null
            }));
            console.log(`✅ Imported ${counts.countries} countries\n`);
        }

        // Provinces/States
        if (tables.province?.length > 0) {
            console.log('--- Importing Provinces/States ---');
            counts.provinces = await insertTable(db.collection('provinces'), tables.province, p => ({
                _id: getObjectId('province', p.id),
                oldId: p.id,
                name: p.name,
                countryId: getObjectId('country', p.countryid),
                oldCountryId: p.countryid,
                code: p.code || null
            }));
            console.log(`✅ Imported ${counts.provinces} provinces\n`);
        }

        // Cities
        if (tables.city?.length > 0) {
            console.log('--- Importing Cities ---');
            counts.cities = await insertTable(db.collection('cities'), tables.city, c => ({
                _id: getObjectId('city', c.id),
                oldId: c.id,
                name: c.name,
                stateId: getObjectId('province', c.stateid),
                oldStateId: c.stateid,
                latitude: c.latitude ? parseNum(c.latitude, null) : null,
                longitude: c.longitude ? parseNum(c.longitude, null) : null,
                createdAt: parseDate(c.createddate),
                updatedAt: parseDate(c.modifieddate)
            }));
            console.log(`✅ Imported ${counts.cities} cities\n`);
        }

        // Pincodes
        if (tables.pincodes?.length > 0) {
            console.log('--- Importing Pincodes ---');
            counts.pincodes = await insertTable(db.collection('pincodes'), tables.pincodes, p => ({
                _id: getObjectId('pincodes', p.id),
                oldId: p.id,
                pincode: p.pincode,
                cityId: getObjectId('city', p.cityid),
                provinceId: getObjectId('province', p.provinceid),
                oldCityId: p.cityid,
                oldProvinceId: p.provinceid
            }));
            console.log(`✅ Imported ${counts.pincodes} pincodes\n`);
        }

        // ===== PHASE 2: Users and Auth =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 2: Users and Authentication');
        console.log('═══════════════════════════════════════════════════════\n');

        // Users
        if (tables.user?.length > 0) {
            console.log('--- Importing Users ---');
            counts.users = await insertTable(db.collection('users'), tables.user, u => ({
                _id: getObjectId('user', u.id),
                oldId: u.id,
                name: u.name,
                email: u.email,
                phone: u.mobilenumber || u.phone || null,
                password: u.password || null,
                role: u.usertype === '1' ? 'seller' : u.usertype === '2' ? 'rider' : 'customer',
                status: parseInt32(u.status, 1),
                // Relationships
                cityId: getObjectId('city', u.cityid),
                provinceId: getObjectId('province', u.stateid),
                oldCityId: u.cityid,
                oldProvinceId: u.stateid,
                // Additional fields
                address: u.address || null,
                pincode: u.pincode || null,
                gstNo: u.gstno || null,
                panNo: u.panno || null,
                wallet: parseNum(u.wallet, 0),
                profileImage: u.profile_image || null,
                latitude: u.latitude ? parseNum(u.latitude, null) : null,
                longitude: u.longitude ? parseNum(u.longitude, null) : null,
                deviceId: u.device_id || null,
                deviceType: u.device_type || null,
                createdAt: parseDate(u.createddate),
                updatedAt: parseDate(u.modifieddate)
            }));
            console.log(`✅ Imported ${counts.users} users\n`);
        }

        // Auth Verification
        if (tables.authverification?.length > 0) {
            console.log('--- Importing Auth Verifications ---');
            counts.authverification = await insertTable(db.collection('authVerifications'), tables.authverification, a => ({
                _id: getObjectId('authverification', a.id),
                oldId: a.id,
                userId: getObjectId('user', a.userid),
                oldUserId: a.userid,
                code: a.code,
                status: parseInt32(a.status, 0),
                createdAt: parseDate(a.createddate)
            }));
            console.log(`✅ Imported ${counts.authverification} auth verifications\n`);
        }

        // User Documents
        if (tables.userdocuments?.length > 0) {
            console.log('--- Importing User Documents ---');
            counts.userdocuments = await insertTable(db.collection('userDocuments'), tables.userdocuments, ud => ({
                _id: getObjectId('userdocuments', ud.id),
                oldId: ud.id,
                userId: getObjectId('user', ud.userid),
                oldUserId: ud.userid,
                documentType: ud.document_type || null,
                documentPath: ud.document_path || null,
                status: parseInt32(ud.status, 0),
                createdAt: parseDate(ud.createddate)
            }));
            console.log(`✅ Imported ${counts.userdocuments} user documents\n`);
        }

        // User Detail
        if (tables.user_detail?.length > 0) {
            console.log('--- Importing User Details ---');
            counts.userDetails = await insertTable(db.collection('userDetails'), tables.user_detail, ud => ({
                _id: getObjectId('user_detail', ud.id),
                oldId: ud.id,
                userId: getObjectId('user', ud.userid),
                oldUserId: ud.userid,
                ...ud
            }));
            console.log(`✅ Imported ${counts.userDetails} user details\n`);
        }

        // User FCM Data
        if (tables.user_fcm_data?.length > 0) {
            console.log('--- Importing User FCM Data ---');
            counts.userFcmData = await insertTable(db.collection('userFcmData'), tables.user_fcm_data, f => ({
                _id: getObjectId('user_fcm_data', f.id),
                oldId: f.id,
                userId: getObjectId('user', f.user_id),
                oldUserId: f.user_id,
                fcmToken: f.fcm_token || null,
                deviceType: f.device_type || null,
                createdAt: parseDate(f.createddate)
            }));
            console.log(`✅ Imported ${counts.userFcmData} FCM tokens\n`);
        }

        // Customer Addresses
        if (tables.customer_address?.length > 0) {
            console.log('--- Importing Customer Addresses ---');
            counts.addresses = await insertTable(db.collection('customerAddresses'), tables.customer_address, a => ({
                _id: getObjectId('customer_address', a.id),
                oldId: a.id,
                userId: getObjectId('user', a.user_id),
                oldUserId: a.user_id,
                address: a.address || null,
                address2: a.address2 || null,
                city: a.city || null,
                state: a.state || null,
                pincode: a.pincode || null,
                landmark: a.landmark || null,
                latitude: a.latitude ? parseNum(a.latitude, null) : null,
                longitude: a.longitude ? parseNum(a.longitude, null) : null,
                isDefault: parseInt32(a.isdefault, 0) === 1,
                createdAt: parseDate(a.createddate),
                updatedAt: parseDate(a.modifieddate)
            }));
            console.log(`✅ Imported ${counts.addresses} addresses\n`);
        }

        // ===== PHASE 3: Categories and Products =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 3: Categories and Products');
        console.log('═══════════════════════════════════════════════════════\n');

        // Main Category
        if (tables.main_category?.length > 0) {
            console.log('--- Importing Main Categories ---');
            counts.mainCategories = await insertTable(db.collection('mainCategories'), tables.main_category, mc => ({
                _id: getObjectId('main_category', mc.id),
                oldId: mc.id,
                name: mc.name,
                image: mc.image || null,
                status: parseInt32(mc.status, 1),
                position: parseInt32(mc.position, 0),
                createdAt: parseDate(mc.createddate),
                updatedAt: parseDate(mc.modifieddate)
            }));
            console.log(`✅ Imported ${counts.mainCategories} main categories\n`);
        }

        // Menu Category
        if (tables.menu_category?.length > 0) {
            console.log('--- Importing Menu Categories ---');
            counts.menuCategories = await insertTable(db.collection('menuCategories'), tables.menu_category, mc => ({
                _id: getObjectId('menu_category', mc.id),
                oldId: mc.id,
                name: mc.name,
                description: mc.description || null,
                image: mc.image || null,
                status: parseInt32(mc.status, 1),
                createdAt: parseDate(mc.createddate)
            }));
            console.log(`✅ Imported ${counts.menuCategories} menu categories\n`);
        }

        // Variants
        if (tables.variants?.length > 0) {
            console.log('--- Importing Variants ---');
            counts.variants = await insertTable(db.collection('variants'), tables.variants, v => ({
                _id: getObjectId('variants', v.id),
                oldId: v.id,
                name: v.name,
                type: v.type || null,
                createdAt: parseDate(v.createddate)
            }));
            console.log(`✅ Imported ${counts.variants} variants\n`);
        }

        // Variant Values
        if (tables.variant_values?.length > 0) {
            console.log('--- Importing Variant Values ---');
            counts.variantValues = await insertTable(db.collection('variantValues'), tables.variant_values, vv => ({
                _id: getObjectId('variant_values', vv.id),
                oldId: vv.id,
                variantId: getObjectId('variants', vv.variant_id),
                oldVariantId: vv.variant_id,
                value: vv.value,
                createdAt: parseDate(vv.createddate)
            }));
            console.log(`✅ Imported ${counts.variantValues} variant values\n`);
        }

        // Products (from productprices table)
        if (tables.productprices?.length > 0) {
            console.log('--- Importing Products ---');
            counts.products = await insertTable(db.collection('products'), tables.productprices, p => ({
                _id: getObjectId('productprices', p.id),
                oldId: p.id,
                name: p.name,
                description: p.description || null,
                price: parseNum(p.price, 0),
                discountPrice: parseNum(p.discount_price, null),
                quantity: parseInt32(p.quantity, 0),
                sku: p.sku || null,
                categoryId: getObjectId('main_category', p.category_id),
                menuCategoryId: getObjectId('menu_category', p.menu_category_id),
                oldCategoryId: p.category_id,
                oldMenuCategoryId: p.menu_category_id,
                image: p.image || null,
                status: parseInt32(p.status, 1),
                isFeatured: parseInt32(p.is_featured, 0) === 1,
                taxPercentage: parseNum(p.tax_percentage, 0),
                unit: p.unit || null,
                minOrderQty: parseInt32(p.min_order_qty, 1),
                maxOrderQty: parseInt32(p.max_order_qty, null),
                createdAt: parseDate(p.createddate),
                updatedAt: parseDate(p.modifieddate)
            }));
            console.log(`✅ Imported ${counts.products} products\n`);
        }

        // Product Variants
        if (tables.productvariant?.length > 0) {
            console.log('--- Importing Product Variants ---');
            counts.productVariants = await insertTable(db.collection('productVariants'), tables.productvariant, v => ({
                _id: getObjectId('productvariant', v.id),
                oldId: v.id,
                productId: getObjectId('productprices', v.productid),
                oldProductId: v.productid,
                name: v.name || null,
                sku: v.sku || null,
                price: parseNum(v.price, 0),
                discountPrice: parseNum(v.discount_price, null),
                stock: parseInt32(v.quantity, 0),
                variantId: getObjectId('variants', v.variant_id),
                variantValueId: getObjectId('variant_values', v.variant_value_id),
                oldVariantId: v.variant_id,
                oldVariantValueId: v.variant_value_id,
                image: v.image || null,
                status: parseInt32(v.status, 1),
                createdAt: parseDate(v.createddate),
                updatedAt: parseDate(v.modifieddate)
            }));
            console.log(`✅ Imported ${counts.productVariants} product variants\n`);
        }

        // Product Images
        if (tables.product_images?.length > 0) {
            console.log('--- Importing Product Images ---');
            counts.productImages = await insertTable(db.collection('productImages'), tables.product_images, img => ({
                _id: getObjectId('product_images', img.id),
                oldId: img.id,
                productId: getObjectId('productprices', img.productid),
                oldProductId: img.productid,
                image: img.image || null,
                position: parseInt32(img.position, 0),
                isDefault: parseInt32(img.is_default, 0) === 1,
                createdAt: parseDate(img.createddate)
            }));
            console.log(`✅ Imported ${counts.productImages} product images\n`);
        }

        // Product Variant Images
        if (tables.productvariantimage?.length > 0) {
            console.log('--- Importing Product Variant Images ---');
            counts.productVariantImages = await insertTable(db.collection('productVariantImages'), tables.productvariantimage, img => ({
                _id: getObjectId('productvariantimage', img.id),
                oldId: img.id,
                variantId: getObjectId('productvariant', img.variantid),
                oldVariantId: img.variantid,
                image: img.image || null,
                position: parseInt32(img.position, 0),
                createdAt: parseDate(img.createddate)
            }));
            console.log(`✅ Imported ${counts.productVariantImages} variant images\n`);
        }

        // Product Reviews
        if (tables.product_review?.length > 0) {
            console.log('--- Importing Product Reviews ---');
            counts.productReviews = await insertTable(db.collection('productReviews'), tables.product_review, r => ({
                _id: getObjectId('product_review', r.id),
                oldId: r.id,
                productId: getObjectId('productprices', r.product_id),
                userId: getObjectId('user', r.user_id),
                oldProductId: r.product_id,
                oldUserId: r.user_id,
                rating: parseInt32(r.rating, 0),
                review: r.review || null,
                status: parseInt32(r.status, 1),
                createdAt: parseDate(r.createddate)
            }));
            console.log(`✅ Imported ${counts.productReviews} product reviews\n`);
        }

        // Product Pincode Discount
        if (tables.product_pincode_discount?.length > 0) {
            console.log('--- Importing Product Pincode Discounts ---');
            counts.productPincodeDiscounts = await insertTable(db.collection('productPincodeDiscounts'), tables.product_pincode_discount, d => ({
                _id: getObjectId('product_pincode_discount', d.id),
                oldId: d.id,
                productId: getObjectId('productprices', d.product_id),
                pincodeId: getObjectId('pincodes', d.pincode_id),
                oldProductId: d.product_id,
                oldPincodeId: d.pincode_id,
                discountPercentage: parseNum(d.discount_percentage, 0),
                discountAmount: parseNum(d.discount_amount, 0),
                startDate: parseDate(d.start_date),
                endDate: parseDate(d.end_date),
                status: parseInt32(d.status, 1)
            }));
            console.log(`✅ Imported ${counts.productPincodeDiscounts} pincode discounts\n`);
        }

        // Wishlist
        if (tables.product_wishlist?.length > 0) {
            console.log('--- Importing Wishlists ---');
            counts.wishlist = await insertTable(db.collection('wishlists'), tables.product_wishlist, w => ({
                _id: getObjectId('product_wishlist', w.id),
                oldId: w.id,
                userId: getObjectId('user', w.user_id),
                productId: getObjectId('productprices', w.product_id),
                oldUserId: w.user_id,
                oldProductId: w.product_id,
                createdAt: parseDate(w.createddate)
            }));
            console.log(`✅ Imported ${counts.wishlist} wishlist items\n`);
        }

        // ===== PHASE 4: Carts =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 4: Shopping Carts');
        console.log('═══════════════════════════════════════════════════════\n');

        // Carts
        if (tables.cart?.length > 0) {
            console.log('--- Importing Carts ---');
            counts.carts = await insertTable(db.collection('carts'), tables.cart, c => ({
                _id: getObjectId('cart', c.id),
                oldId: c.id,
                storeId: getObjectId('store', c.store_id),
                userId: getObjectId('user', c.user_id),
                productId: getObjectId('productprices', c.product_id),
                priceId: getObjectId('productprices', c.price_id),
                variantId: getObjectId('productvariant', c.variant_id),
                oldStoreId: c.store_id,
                oldUserId: c.user_id,
                oldProductId: c.product_id,
                oldPriceId: c.price_id,
                oldVariantId: c.variant_id,
                name: c.name,
                quantity: parseInt32(c.quantity, 1),
                price: parseNum(c.price, 0),
                couponCode: c.couponcode || null,
                expectedDeliveryDate: c.expected_delivery_date ? parseDate(c.expected_delivery_date) : null,
                deliveryPincode: c.delivery_pincode || null,
                createdAt: parseDate(c.createddate),
                updatedAt: parseDate(c.modifieddate)
            }));
            console.log(`✅ Imported ${counts.carts} cart items\n`);
        }

        // ===== PHASE 5: Orders =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 5: Orders and Transactions');
        console.log('═══════════════════════════════════════════════════════\n');

        // Orders
        if (tables.orders?.length > 0) {
            console.log('--- Importing Orders ---');
            counts.orders = await insertTable(db.collection('orders'), tables.orders, o => ({
                _id: getObjectId('orders', o.id),
                oldId: o.id,
                // Relationships
                userId: getObjectId('user', o.userid),
                customerId: getObjectId('user', o.customerid),
                addressId: getObjectId('customer_address', o.addressid),
                riderId: getObjectId('user', o.riderid),
                oldUserId: o.userid,
                oldCustomerId: o.customerid,
                oldAddressId: o.addressid,
                oldRiderId: o.riderid,
                // Order info
                orderNo: o.orderid || o.orderno || null,
                customerName: o.customer_name || null,
                customerPhone: o.customer_mobileno || null,
                customerEmail: o.customer_email || null,
                deliveryAddress: o.delivery_address || null,
                deliveryCity: o.delivery_city || null,
                deliveryState: o.delivery_state || null,
                deliveryPincode: o.delivery_pincode || null,
                orderAmount: parseNum(o.orderamount, 0),
                taxAmount: parseNum(o.taxamount, 0),
                deliveryCharge: parseNum(o.deliverycharge, 0),
                netAmount: parseNum(o.netamount || o.orderamount, 0),
                couponCode: o.couponcode || null,
                couponAmount: parseNum(o.couponamount, 0),
                paymentStatus: parseInt32(o.payment_status, 0),
                paymentMethod: o.paymentmethod || null,
                paymentId: o.payment_id || null,
                orderDate: parseDate(o.orderdate),
                deliveryDate: o.delivery_date ? parseDate(o.delivery_date) : null,
                status: parseInt32(o.status, 1),
                orderNote: o.order_note || null,
                createdAt: parseDate(o.createddate || o.orderdate),
                updatedAt: parseDate(o.modifieddate)
            }));
            console.log(`✅ Imported ${counts.orders} orders\n`);
        }

        // Order Items
        if (tables.orderitems?.length > 0) {
            console.log('--- Importing Order Items ---');
            counts.orderItems = await insertTable(db.collection('orderItems'), tables.orderitems, oi => ({
                _id: getObjectId('orderitems', oi.id),
                oldId: oi.id,
                orderId: getObjectId('orders', oi.orderid),
                productId: getObjectId('productprices', oi.productid),
                variantId: getObjectId('productvariant', oi.variantid),
                oldOrderId: oi.orderid,
                oldProductId: oi.productid,
                oldVariantId: oi.variantid,
                productName: oi.product_name || null,
                quantity: parseInt32(oi.quantity, 1),
                price: parseNum(oi.price, 0),
                discountPrice: parseNum(oi.discount_price, null),
                total: parseNum(oi.total, 0),
                taxAmount: parseNum(oi.tax_amount, 0),
                createdAt: parseDate(oi.createddate)
            }));
            console.log(`✅ Imported ${counts.orderItems} order items\n`);
        }

        // Favorite Orders
        if (tables.favorite_orders?.length > 0) {
            console.log('--- Importing Favorite Orders ---');
            counts.favoriteOrders = await insertTable(db.collection('favoriteOrders'), tables.favorite_orders, fo => ({
                _id: getObjectId('favorite_orders', fo.id),
                oldId: fo.id,
                userId: getObjectId('user', fo.user_id),
                orderId: getObjectId('orders', fo.order_id),
                oldUserId: fo.user_id,
                oldOrderId: fo.order_id,
                createdAt: parseDate(fo.createddate)
            }));
            console.log(`✅ Imported ${counts.favoriteOrders} favorite orders\n`);
        }

        // Rejected Orders
        if (tables.rejectedorders?.length > 0) {
            console.log('--- Importing Rejected Orders ---');
            counts.rejectedOrders = await insertTable(db.collection('rejectedOrders'), tables.rejectedorders, ro => ({
                _id: getObjectId('rejectedorders', ro.id),
                oldId: ro.id,
                orderId: getObjectId('orders', ro.orderid),
                oldOrderId: ro.orderid,
                reason: ro.reason || null,
                rejectedBy: getObjectId('user', ro.rejected_by),
                oldRejectedBy: ro.rejected_by,
                createdAt: parseDate(ro.createddate)
            }));
            console.log(`✅ Imported ${counts.rejectedOrders} rejected orders\n`);
        }

        // Orders Reject Kitchen
        if (tables.orders_reject_kitchen?.length > 0) {
            console.log('--- Importing Kitchen Rejected Orders ---');
            counts.ordersRejectKitchen = await insertTable(db.collection('ordersRejectKitchen'), tables.orders_reject_kitchen, ork => ({
                _id: getObjectId('orders_reject_kitchen', ork.id),
                oldId: ork.id,
                orderId: getObjectId('orders', ork.order_id),
                oldOrderId: ork.order_id,
                ...ork
            }));
            console.log(`✅ Imported ${counts.ordersRejectKitchen} kitchen rejected orders\n`);
        }

        // Order Cancel Request
        if (tables.order_cancel_request?.length > 0) {
            console.log('--- Importing Order Cancel Requests ---');
            counts.orderCancelRequests = await insertTable(db.collection('orderCancelRequests'), tables.order_cancel_request, ocr => ({
                _id: getObjectId('order_cancel_request', ocr.id),
                oldId: ocr.id,
                orderId: getObjectId('orders', ocr.order_id),
                userId: getObjectId('user', ocr.user_id),
                oldOrderId: ocr.order_id,
                oldUserId: ocr.user_id,
                reason: ocr.reason || null,
                status: parseInt32(ocr.status, 0),
                createdAt: parseDate(ocr.createddate)
            }));
            console.log(`✅ Imported ${counts.orderCancelRequests} cancel requests\n`);
        }

        // Transactions
        if (tables.transaction?.length > 0) {
            console.log('--- Importing Transactions ---');
            counts.transactions = await insertTable(db.collection('transactions'), tables.transaction, t => ({
                _id: getObjectId('transaction', t.id),
                oldId: t.id,
                userId: getObjectId('user', t.user_id),
                orderId: getObjectId('orders', t.orderid),
                oldUserId: t.user_id,
                oldOrderId: t.orderid,
                amount: parseNum(t.amount, 0),
                type: t.type || 'debit',
                transactionType: t.transaction_type || null,
                paymentMethod: t.payment_method || null,
                paymentId: t.payment_id || null,
                status: t.status || 'pending',
                description: t.description || null,
                createdAt: parseDate(t.createddate)
            }));
            console.log(`✅ Imported ${counts.transactions} transactions\n`);
        }

        // Wallet History
        if (tables.wallet_history?.length > 0) {
            console.log('--- Importing Wallet History ---');
            counts.walletHistory = await insertTable(db.collection('walletHistory'), tables.wallet_history, wh => ({
                _id: getObjectId('wallet_history', wh.id),
                oldId: wh.id,
                userId: getObjectId('user', wh.user_id),
                orderId: getObjectId('orders', wh.order_id),
                oldUserId: wh.user_id,
                oldOrderId: wh.order_id,
                amount: parseNum(wh.amount, 0),
                type: wh.type || null,
                description: wh.description || null,
                balanceBefore: parseNum(wh.balance_before, 0),
                balanceAfter: parseNum(wh.balance_after, 0),
                createdAt: parseDate(wh.createddate)
            }));
            console.log(`✅ Imported ${counts.walletHistory} wallet transactions\n`);
        }

        // ===== PHASE 6: Offers, Notifications, and Settings =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 6: Offers, Notifications & Settings');
        console.log('═══════════════════════════════════════════════════════\n');

        // Offers
        if (tables.offer?.length > 0) {
            console.log('--- Importing Offers ---');
            counts.offers = await insertTable(db.collection('offers'), tables.offer, o => ({
                _id: getObjectId('offer', o.id),
                oldId: o.id,
                code: o.code || null,
                title: o.title || null,
                description: o.description || null,
                discountType: o.discount_type || null,
                discountValue: parseNum(o.discount_value, 0),
                minOrderAmount: parseNum(o.min_order_amount, 0),
                maxDiscountAmount: parseNum(o.max_discount_amount, null),
                startDate: parseDate(o.start_date),
                endDate: parseDate(o.end_date),
                usageLimit: parseInt32(o.usage_limit, null),
                usedCount: parseInt32(o.used_count, 0),
                status: parseInt32(o.status, 1),
                createdAt: parseDate(o.createddate)
            }));
            console.log(`✅ Imported ${counts.offers} offers\n`);
        }

        // Notifications
        if (tables.notification?.length > 0) {
            console.log('--- Importing Notifications ---');
            counts.notifications = await insertTable(db.collection('notifications'), tables.notification, n => ({
                _id: getObjectId('notification', n.id),
                oldId: n.id,
                userId: getObjectId('user', n.user_id),
                orderId: getObjectId('orders', n.order_id),
                oldUserId: n.user_id,
                oldOrderId: n.order_id,
                title: n.title || null,
                message: n.message || null,
                type: n.type || null,
                isRead: parseInt32(n.is_read, 0) === 1,
                createdAt: parseDate(n.createddate)
            }));
            console.log(`✅ Imported ${counts.notifications} notifications\n`);
        }

        // Feedback
        if (tables.feedback?.length > 0) {
            console.log('--- Importing Feedback ---');
            counts.feedback = await insertTable(db.collection('feedback'), tables.feedback, f => ({
                _id: getObjectId('feedback', f.id),
                oldId: f.id,
                userId: getObjectId('user', f.user_id),
                orderId: getObjectId('orders', f.order_id),
                oldUserId: f.user_id,
                oldOrderId: f.order_id,
                rating: parseInt32(f.rating, 0),
                comment: f.comment || null,
                createdAt: parseDate(f.createddate)
            }));
            console.log(`✅ Imported ${counts.feedback} feedback entries\n`);
        }

        // Rider Feedback
        if (tables.riderfeedback?.length > 0) {
            console.log('--- Importing Rider Feedback ---');
            counts.riderFeedback = await insertTable(db.collection('riderFeedback'), tables.riderfeedback, rf => ({
                _id: getObjectId('riderfeedback', rf.id),
                oldId: rf.id,
                riderId: getObjectId('user', rf.rider_id),
                orderId: getObjectId('orders', rf.order_id),
                oldRiderId: rf.rider_id,
                oldOrderId: rf.order_id,
                rating: parseInt32(rf.rating, 0),
                comment: rf.comment || null,
                createdAt: parseDate(rf.createddate)
            }));
            console.log(`✅ Imported ${counts.riderFeedback} rider feedback\n`);
        }

        // Kitchen Messages
        if (tables.kitchenmessages?.length > 0) {
            console.log('--- Importing Kitchen Messages ---');
            counts.kitchenMessages = await insertTable(db.collection('kitchenMessages'), tables.kitchenmessages, km => ({
                _id: getObjectId('kitchenmessages', km.id),
                oldId: km.id,
                orderId: getObjectId('orders', km.order_id),
                oldOrderId: km.order_id,
                message: km.message || null,
                status: parseInt32(km.status, 0),
                createdAt: parseDate(km.createddate)
            }));
            console.log(`✅ Imported ${counts.kitchenMessages} kitchen messages\n`);
        }

        // Email Templates
        if (tables.emailtemplate?.length > 0) {
            console.log('--- Importing Email Templates ---');
            counts.emailTemplates = await insertTable(db.collection('emailTemplates'), tables.emailtemplate, et => ({
                _id: getObjectId('emailtemplate', et.id),
                oldId: et.id,
                name: et.name || null,
                subject: et.subject || null,
                body: et.body || null,
                status: parseInt32(et.status, 1),
                createdAt: parseDate(et.createddate)
            }));
            console.log(`✅ Imported ${counts.emailTemplates} email templates\n`);
        }

        // Manage Content
        if (tables.managecontent?.length > 0) {
            console.log('--- Importing Manage Content ---');
            counts.manageContent = await insertTable(db.collection('manageContent'), tables.managecontent, mc => ({
                _id: getObjectId('managecontent', mc.id),
                oldId: mc.id,
                key: mc.key || null,
                value: mc.value || null,
                type: mc.type || null,
                createdAt: parseDate(mc.createddate)
            }));
            console.log(`✅ Imported ${counts.manageContent} content items\n`);
        }

        // Site Settings
        if (tables.sitesetting?.length > 0) {
            console.log('--- Importing Site Settings ---');
            counts.siteSettings = await insertTable(db.collection('siteSettings'), tables.sitesetting, ss => ({
                _id: getObjectId('sitesetting', ss.id),
                oldId: ss.id,
                ...ss
            }));
            console.log(`✅ Imported ${counts.siteSettings} site settings\n`);
        }

        // Delivery Charge Settings
        if (tables.delivery_charge_setting?.length > 0) {
            console.log('--- Importing Delivery Charge Settings ---');
            counts.deliveryChargeSettings = await insertTable(db.collection('deliveryChargeSettings'), tables.delivery_charge_setting, dcs => ({
                _id: getObjectId('delivery_charge_setting', dcs.id),
                oldId: dcs.id,
                minOrderAmount: parseNum(dcs.min_order_amount, 0),
                maxOrderAmount: parseNum(dcs.max_order_amount, 0),
                deliveryCharge: parseNum(dcs.delivery_charge, 0),
                freeDeliveryAbove: parseNum(dcs.free_delivery_above, null),
                status: parseInt32(dcs.status, 1)
            }));
            console.log(`✅ Imported ${counts.deliveryChargeSettings} delivery settings\n`);
        }

        // Pincode Delivery
        if (tables.pincode_delivery?.length > 0) {
            console.log('--- Importing Pincode Delivery ---');
            counts.pincodeDelivery = await insertTable(db.collection('pincodeDelivery'), tables.pincode_delivery, pd => ({
                _id: getObjectId('pincode_delivery', pd.id),
                oldId: pd.id,
                pincodeId: getObjectId('pincodes', pd.pincode_id),
                oldPincodeId: pd.pincode_id,
                deliveryCharge: parseNum(pd.delivery_charge, 0),
                estimatedDays: parseInt32(pd.estimated_days, 0),
                isAvailable: parseInt32(pd.is_available, 1) === 1
            }));
            console.log(`✅ Imported ${counts.pincodeDelivery} pincode delivery settings\n`);
        }

        // ===== PHASE 7: Menus and Rider Data =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 7: Menus and Rider Management');
        console.log('═══════════════════════════════════════════════════════\n');

        // Menu
        if (tables.menu?.length > 0) {
            console.log('--- Importing Menu Items ---');
            counts.menuItems = await insertTable(db.collection('menuItems'), tables.menu, m => ({
                _id: getObjectId('menu', m.id),
                oldId: m.id,
                categoryId: getObjectId('menu_category', m.category_id),
                productId: getObjectId('productprices', m.product_id),
                oldCategoryId: m.category_id,
                oldProductId: m.product_id,
                name: m.name || null,
                description: m.description || null,
                price: parseNum(m.price, 0),
                image: m.image || null,
                status: parseInt32(m.status, 1),
                position: parseInt32(m.position, 0),
                createdAt: parseDate(m.createddate)
            }));
            console.log(`✅ Imported ${counts.menuItems} menu items\n`);
        }

        // Store Menu
        if (tables.store_menu?.length > 0) {
            console.log('--- Importing Store Menu ---');
            counts.storeMenu = await insertTable(db.collection('storeMenu'), tables.store_menu, sm => ({
                _id: getObjectId('store_menu', sm.id),
                oldId: sm.id,
                storeId: getObjectId('store', sm.store_id),
                menuId: getObjectId('menu', sm.menu_id),
                oldStoreId: sm.store_id,
                oldMenuId: sm.menu_id,
                status: parseInt32(sm.status, 1),
                createdAt: parseDate(sm.createddate)
            }));
            console.log(`✅ Imported ${counts.storeMenu} store menu items\n`);
        }

        // Rider Menu
        if (tables.rider_menu?.length > 0) {
            console.log('--- Importing Rider Menu ---');
            counts.riderMenu = await insertTable(db.collection('riderMenu'), tables.rider_menu, rm => ({
                _id: getObjectId('rider_menu', rm.id),
                oldId: rm.id,
                riderId: getObjectId('user', rm.rider_id),
                oldRiderId: rm.rider_id,
                ...rm
            }));
            console.log(`✅ Imported ${counts.riderMenu} rider menu items\n`);
        }

        // Rider History
        if (tables.rider_history?.length > 0) {
            console.log('--- Importing Rider History ---');
            counts.riderHistory = await insertTable(db.collection('riderHistory'), tables.rider_history, rh => ({
                _id: getObjectId('rider_history', rh.id),
                oldId: rh.id,
                riderId: getObjectId('user', rh.rider_id),
                orderId: getObjectId('orders', rh.order_id),
                oldRiderId: rh.rider_id,
                oldOrderId: rh.order_id,
                status: rh.status || null,
                createdAt: parseDate(rh.createddate)
            }));
            console.log(`✅ Imported ${counts.riderHistory} rider history records\n`);
        }

        // Rider Sessions
        if (tables.rider_sessions?.length > 0) {
            console.log('--- Importing Rider Sessions ---');
            counts.riderSessions = await insertTable(db.collection('riderSessions'), tables.rider_sessions, rs => ({
                _id: getObjectId('rider_sessions', rs.id),
                oldId: rs.id,
                riderId: getObjectId('user', rs.rider_id),
                oldRiderId: rs.rider_id,
                sessionStart: parseDate(rs.session_start),
                sessionEnd: rs.session_end ? parseDate(rs.session_end) : null,
                status: rs.status || null
            }));
            console.log(`✅ Imported ${counts.riderSessions} rider sessions\n`);
        }

        // ===== PHASE 8: Temporary Tables =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 8: Temporary/Legacy Tables');
        console.log('═══════════════════════════════════════════════════════\n');

        // Temp tables - only import if they have data
        if (tables.cart_temp?.length > 0) {
            counts.cartTemp = await insertTable(db.collection('cartTemp'), tables.cart_temp);
            console.log(`✅ Imported ${counts.cartTemp} temp cart items\n`);
        }

        if (tables.user_temp?.length > 0) {
            counts.userTemp = await insertTable(db.collection('userTemp'), tables.user_temp);
            console.log(`✅ Imported ${counts.userTemp} temp users\n`);
        }

        if (tables.temp_productprices?.length > 0) {
            counts.tempProductPrices = await insertTable(db.collection('tempProductPrices'), tables.temp_productprices);
            console.log(`✅ Imported ${counts.tempProductPrices} temp products\n`);
        }

        if (tables.temp_productvariant?.length > 0) {
            counts.tempProductVariant = await insertTable(db.collection('tempProductVariant'), tables.temp_productvariant);
            console.log(`✅ Imported ${counts.tempProductVariant} temp variants\n`);
        }

        if (tables.temp_productvariantimage?.length > 0) {
            counts.tempProductVariantImage = await insertTable(db.collection('tempProductVariantImage'), tables.temp_productvariantimage);
            console.log(`✅ Imported ${counts.tempProductVariantImage} temp variant images\n`);
        }

        if (tables.temp_foodies_payment_data?.length > 0) {
            counts.tempFoodiesPaymentData = await insertTable(db.collection('tempFoodiesPaymentData'), tables.temp_foodies_payment_data);
            console.log(`✅ Imported ${counts.tempFoodiesPaymentData} temp payment data\n`);
        }

        // Summary
        console.log('\n════════════════════════════════════════════════════════');
        console.log('  ✨ COMPLETE DATA MIGRATION SUMMARY ✨');
        console.log('════════════════════════════════════════════════════════');

        const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
        console.log(`\nTotal Records Imported: ${totalRecords}`);
        console.log(`Total Collections: ${Object.keys(counts).length}\n`);

        console.log('Records by Collection:');
        console.log('────────────────────────────────────────────────────────');
        Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .forEach(([key, value]) => {
                if (value > 0) {
                    console.log(`  ${key.padEnd(30)} : ${value.toString().padStart(6)}`);
                }
            });
        console.log('════════════════════════════════════════════════════════\n');

        console.log('🎉 All data imported successfully with MongoDB ObjectIds!');
        console.log('📝 Old IDs preserved in "oldId" fields for reference');
        console.log('🔗 All relationships mapped to new ObjectIds\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

seedLegacyData();
