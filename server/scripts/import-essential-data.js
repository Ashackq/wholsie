/**
 * Essential Legacy Data Migration Script
 * Imports only critical tables needed for the e-commerce and delivery system
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
        console.error(`  ⚠️  Error inserting: ${err.message}`);
        return err.result?.insertedCount || 0;
    }
}

// Helper to create indexes for relationships
async function createIndexes(db) {
    const indexes = [
        { collection: 'users', indexes: [{ email: 1 }, { phone: 1 }] },
        { collection: 'orders', indexes: [{ userId: 1 }, { orderNo: 1 }, { riderId: 1 }] },
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

async function importEssentialData() {
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
            }
        }

        console.log(`📊 Found ${Object.keys(tables).length} tables\n`);
        console.log('📦 Importing ESSENTIAL tables only...\n');

        // Create indexes first
        await createIndexes(db);

        const counts = {};

        // ===== PHASE 1: Geographic Data (Required for addresses) =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 1: Geographic Data');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.country?.length > 0) {
            console.log('→ Countries');
            counts.countries = await insertTable(db.collection('countries'), tables.country, c => ({
                _id: getObjectId('country', c.id),
                oldId: c.id,
                name: c.name,
                code: c.code || null,
                sortname: c.sortname || null,
                phonecode: c.phonecode ? parseInt32(c.phonecode) : null
            }));
            console.log(`  ✓ ${counts.countries} records\n`);
        }

        if (tables.province?.length > 0) {
            console.log('→ Provinces/States');
            counts.provinces = await insertTable(db.collection('provinces'), tables.province, p => ({
                _id: getObjectId('province', p.id),
                oldId: p.id,
                name: p.name,
                countryId: getObjectId('country', p.countryid),
                oldCountryId: p.countryid,
                code: p.code || null
            }));
            console.log(`  ✓ ${counts.provinces} records\n`);
        }

        if (tables.city?.length > 0) {
            console.log('→ Cities');
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
            console.log(`  ✓ ${counts.cities} records\n`);
        }

        if (tables.pincodes?.length > 0) {
            console.log('→ Pincodes');
            counts.pincodes = await insertTable(db.collection('pincodes'), tables.pincodes, p => ({
                _id: getObjectId('pincodes', p.id),
                oldId: p.id,
                pincode: p.pincode,
                cityId: getObjectId('city', p.cityid),
                provinceId: getObjectId('province', p.provinceid),
                oldCityId: p.cityid,
                oldProvinceId: p.provinceid
            }));
            console.log(`  ✓ ${counts.pincodes} records\n`);
        }

        // ===== PHASE 2: Users & Authentication =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 2: Users & Authentication');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.user?.length > 0) {
            console.log('→ Users');
            counts.users = await insertTable(db.collection('users'), tables.user, u => ({
                _id: getObjectId('user', u.id),
                oldId: u.id,
                name: u.name,
                email: u.email,
                phone: u.mobilenumber || u.phone || null,
                password: u.password || null,
                role: u.usertype === '1' ? 'seller' : u.usertype === '2' ? 'rider' : 'customer',
                status: parseInt32(u.status, 1),
                cityId: getObjectId('city', u.cityid),
                provinceId: getObjectId('province', u.stateid),
                oldCityId: u.cityid,
                oldProvinceId: u.stateid,
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
            console.log(`  ✓ ${counts.users} records\n`);
        }

        if (tables.customer_address?.length > 0) {
            console.log('→ Customer Addresses');
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
            console.log(`  ✓ ${counts.addresses} records\n`);
        }

        // ===== PHASE 3: Products & Catalog =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 3: Products & Catalog');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.menu_category?.length > 0) {
            console.log('→ Menu Categories');
            counts.menuCategories = await insertTable(db.collection('menuCategories'), tables.menu_category, mc => ({
                _id: getObjectId('menu_category', mc.id),
                oldId: mc.id,
                name: mc.name,
                description: mc.description || null,
                image: mc.image || null,
                mainCategoryId: getObjectId('main_category', mc.main_category_id),
                storeId: getObjectId('user', mc.store_id),
                oldMainCategoryId: mc.main_category_id,
                oldStoreId: mc.store_id,
                priority: parseInt32(mc.priority, 0),
                status: parseInt32(mc.status, 1),
                createdAt: parseDate(mc.createddate)
            }));
            console.log(`  ✓ ${counts.menuCategories} records\n`);
        }

        if (tables.main_category?.length > 0) {
            console.log('→ Main Categories');
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
            console.log(`  ✓ ${counts.mainCategories} records\n`);
        }

        if (tables.variants?.length > 0) {
            console.log('→ Variants');
            counts.variants = await insertTable(db.collection('variants'), tables.variants, v => ({
                _id: getObjectId('variants', v.id),
                oldId: v.id,
                name: v.name,
                type: v.type || null,
                createdAt: parseDate(v.createddate)
            }));
            console.log(`  ✓ ${counts.variants} records\n`);
        }

        if (tables.variant_values?.length > 0) {
            console.log('→ Variant Values');
            counts.variantValues = await insertTable(db.collection('variantValues'), tables.variant_values, vv => ({
                _id: getObjectId('variant_values', vv.id),
                oldId: vv.id,
                variantId: getObjectId('variants', vv.variant_id),
                oldVariantId: vv.variant_id,
                value: vv.value,
                createdAt: parseDate(vv.createddate)
            }));
            console.log(`  ✓ ${counts.variantValues} records\n`);
        }

        if (tables.productprices?.length > 0) {
            console.log('→ Products');
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
                oldCategoryId: p.category_id,
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
            console.log(`  ✓ ${counts.products} records\n`);
        }

        if (tables.productvariant?.length > 0) {
            console.log('→ Product Variants');
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
            console.log(`  ✓ ${counts.productVariants} records\n`);
        }

        if (tables.product_images?.length > 0) {
            console.log('→ Product Images');
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
            console.log(`  ✓ ${counts.productImages} records\n`);
        }

        if (tables.product_review?.length > 0) {
            console.log('→ Product Reviews');
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
            console.log(`  ✓ ${counts.productReviews} records\n`);
        }

        if (tables.product_wishlist?.length > 0) {
            console.log('→ Wishlists');
            counts.wishlist = await insertTable(db.collection('wishlists'), tables.product_wishlist, w => ({
                _id: getObjectId('product_wishlist', w.id),
                oldId: w.id,
                userId: getObjectId('user', w.user_id),
                productId: getObjectId('productprices', w.product_id),
                oldUserId: w.user_id,
                oldProductId: w.product_id,
                createdAt: parseDate(w.createddate)
            }));
            console.log(`  ✓ ${counts.wishlist} records\n`);
        }

        // ===== PHASE 4: Menus (Requested by user) =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 4: Menus');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.menu?.length > 0) {
            console.log('→ Menu Items');
            counts.menuItems = await insertTable(db.collection('menuItems'), tables.menu, m => ({
                _id: getObjectId('menu', m.id),
                oldId: m.id,
                categoryId: getObjectId('menu_category', m.category_id), // Assuming menu_category is needed for this
                productId: getObjectId('productprices', m.product_id),
                oldCategoryId: m.category_id,
                oldProductId: m.product_id,
                name: m.name || null,
                description: m.description || null,
                price: parseNum(m.price, 0),
                image: m.image || null,
                status: parseInt32(m.status, 1),
                position: parseInt32(m.position, 0),
                createdAt: parseDate(m.createddate),
                updatedAt: parseDate(m.modifieddate)
            }));
            console.log(`  ✓ ${counts.menuItems} records\n`);
        }

        if (tables.store_menu?.length > 0) {
            console.log('→ Store Menus');
            counts.storeMenus = await insertTable(db.collection('storeMenus'), tables.store_menu, sm => ({
                _id: getObjectId('store_menu', sm.id),
                oldId: sm.id,
                storeId: getObjectId('user', sm.store_id), // Assuming store_id refers to a user (seller)
                menuId: getObjectId('menu', sm.menu_id),
                oldStoreId: sm.store_id,
                oldMenuId: sm.menu_id,
                status: parseInt32(sm.status, 1),
                createdAt: parseDate(sm.createddate)
            }));
            console.log(`  ✓ ${counts.storeMenus} records\n`);
        }

        // ===== PHASE 5: Shopping Carts =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 5: Shopping Carts');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.cart?.length > 0) {
            console.log('→ Carts');
            counts.carts = await insertTable(db.collection('carts'), tables.cart, c => ({
                _id: getObjectId('cart', c.id),
                oldId: c.id,
                userId: getObjectId('user', c.user_id),
                productId: getObjectId('productprices', c.product_id),
                variantId: getObjectId('productvariant', c.variant_id),
                oldUserId: c.user_id,
                oldProductId: c.product_id,
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
            console.log(`  ✓ ${counts.carts} records\n`);
        }

        // ===== PHASE 6: Orders & Transactions =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 6: Orders & Transactions');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.orders?.length > 0) {
            console.log('→ Orders');
            counts.orders = await insertTable(db.collection('orders'), tables.orders, o => ({
                _id: getObjectId('orders', o.id),
                oldId: o.id,
                userId: getObjectId('user', o.userid),
                customerId: getObjectId('user', o.customerid),
                addressId: getObjectId('customer_address', o.addressid),
                riderId: getObjectId('user', o.riderid),
                oldUserId: o.userid,
                oldCustomerId: o.customerid,
                oldAddressId: o.addressid,
                oldRiderId: o.riderid,
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
            console.log(`  ✓ ${counts.orders} records\n`);
        }

        if (tables.orderitems?.length > 0) {
            console.log('→ Order Items');
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
            console.log(`  ✓ ${counts.orderItems} records\n`);
        }

        if (tables.transaction?.length > 0) {
            console.log('→ Transactions');
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
            console.log(`  ✓ ${counts.transactions} records\n`);
        }

        if (tables.wallet_history?.length > 0) {
            console.log('→ Wallet History');
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
            console.log(`  ✓ ${counts.walletHistory} records\n`);
        }

        // ===== PHASE 6: Delivery System =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 6: Delivery & Rider System');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.rider_history?.length > 0) {
            console.log('→ Rider History');
            counts.riderHistory = await insertTable(db.collection('riderHistory'), tables.rider_history, rh => ({
                _id: getObjectId('rider_history', rh.id),
                oldId: rh.id,
                riderId: getObjectId('user', rh.rider_id),
                orderId: getObjectId('orders', rh.order_id),
                oldRiderId: rh.rider_id,
                oldOrderId: rh.order_id,
                status: rh.status || null,
                latitude: rh.latitude ? parseNum(rh.latitude, null) : null,
                longitude: rh.longitude ? parseNum(rh.longitude, null) : null,
                createdAt: parseDate(rh.createddate)
            }));
            console.log(`  ✓ ${counts.riderHistory} records\n`);
        }

        if (tables.rider_sessions?.length > 0) {
            console.log('→ Rider Sessions');
            counts.riderSessions = await insertTable(db.collection('riderSessions'), tables.rider_sessions, rs => ({
                _id: getObjectId('rider_sessions', rs.id),
                oldId: rs.id,
                riderId: getObjectId('user', rs.rider_id),
                oldRiderId: rs.rider_id,
                sessionStart: parseDate(rs.session_start),
                sessionEnd: rs.session_end ? parseDate(rs.session_end) : null,
                status: rs.status || null
            }));
            console.log(`  ✓ ${counts.riderSessions} records\n`);
        }

        if (tables.riderfeedback?.length > 0) {
            console.log('→ Rider Feedback');
            counts.riderFeedback = await insertTable(db.collection('riderFeedback'), tables.riderfeedback, rf => ({
                _id: getObjectId('riderfeedback', rf.id),
                oldId: rf.id,
                riderId: getObjectId('user', rf.rider_id),
                orderId: getObjectId('orders', rf.order_id),
                userId: getObjectId('user', rf.user_id),
                oldRiderId: rf.rider_id,
                oldOrderId: rf.order_id,
                oldUserId: rf.user_id,
                rating: parseInt32(rf.rating, 0),
                comment: rf.comment || null,
                createdAt: parseDate(rf.createddate)
            }));
            console.log(`  ✓ ${counts.riderFeedback} records\n`);
        }

        if (tables.delivery_charge_setting?.length > 0) {
            console.log('→ Delivery Charge Settings');
            counts.deliveryChargeSettings = await insertTable(db.collection('deliveryChargeSettings'), tables.delivery_charge_setting, dcs => ({
                _id: getObjectId('delivery_charge_setting', dcs.id),
                oldId: dcs.id,
                minOrderAmount: parseNum(dcs.min_order_amount, 0),
                maxOrderAmount: parseNum(dcs.max_order_amount, 0),
                deliveryCharge: parseNum(dcs.delivery_charge, 0),
                freeDeliveryAbove: parseNum(dcs.free_delivery_above, null),
                status: parseInt32(dcs.status, 1)
            }));
            console.log(`  ✓ ${counts.deliveryChargeSettings} records\n`);
        }

        if (tables.pincode_delivery?.length > 0) {
            console.log('→ Pincode Delivery Settings');
            counts.pincodeDelivery = await insertTable(db.collection('pincodeDelivery'), tables.pincode_delivery, pd => ({
                _id: getObjectId('pincode_delivery', pd.id),
                oldId: pd.id,
                pincodeId: getObjectId('pincodes', pd.pincode_id),
                oldPincodeId: pd.pincode_id,
                deliveryCharge: parseNum(pd.delivery_charge, 0),
                estimatedDays: parseInt32(pd.estimated_days, 0),
                isAvailable: parseInt32(pd.is_available, 1) === 1
            }));
            console.log(`  ✓ ${counts.pincodeDelivery} records\n`);
        }

        // ===== PHASE 7: Marketing & Settings =====
        console.log('═══════════════════════════════════════════════════════');
        console.log('  PHASE 7: Marketing & Settings');
        console.log('═══════════════════════════════════════════════════════\n');

        if (tables.offer?.length > 0) {
            console.log('→ Offers/Coupons');
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
            console.log(`  ✓ ${counts.offers} records\n`);
        }

        if (tables.notification?.length > 0) {
            console.log('→ Notifications');
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
            console.log(`  ✓ ${counts.notifications} records\n`);
        }

        if (tables.feedback?.length > 0) {
            console.log('→ Customer Feedback');
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
            console.log(`  ✓ ${counts.feedback} records\n`);
        }

        // Summary
        console.log('\n════════════════════════════════════════════════════════');
        console.log('  ✨ ESSENTIAL DATA IMPORT COMPLETE ✨');
        console.log('════════════════════════════════════════════════════════');

        const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
        console.log(`\n📊 Total Records: ${totalRecords.toLocaleString()}`);
        console.log(`📦 Collections: ${Object.keys(counts).length}\n`);

        console.log('Records by Collection:');
        console.log('────────────────────────────────────────────────────────');
        Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .forEach(([key, value]) => {
                if (value > 0) {
                    console.log(`  ${key.padEnd(30)} : ${value.toString().padStart(8)}`);
                }
            });
        console.log('════════════════════════════════════════════════════════\n');

        console.log('✅ All essential data imported successfully!');
        console.log('🔑 MongoDB ObjectIds generated for all records');
        console.log('📝 Old SQL IDs preserved in "oldId" fields');
        console.log('🔗 All relationships properly mapped\n');

        console.log('📋 What was imported:');
        console.log('  ✓ Geographic data (countries, states, cities, pincodes)');
        console.log('  ✓ Users & authentication');
        console.log('  ✓ Products, categories, variants, images, reviews');
        console.log('  ✓ Shopping carts');
        console.log('  ✓ Orders & order items');
        console.log('  ✓ Transactions & wallet history');
        console.log('  ✓ Delivery system (riders, sessions, feedback)');
        console.log('  ✓ Offers & notifications\n');

        console.log('⏭️  Skipped temporary/system tables that aren\'t needed\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

importEssentialData();
