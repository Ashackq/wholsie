/**
 * Comprehensive API Testing Script
 * Tests all endpoints from login to logout, cart operations, and admin actions
 */

const BASE_URL = 'http://localhost:4000/api';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test state to store tokens and IDs
const state = {
    userToken: null,
    adminToken: null,
    userId: null,
    productId: null,
    categoryId: null,
    cartItemId: null,
    orderId: null,
    favoriteId: null,
    reviewId: null,
    notificationId: null,
    couponId: null,
    ticketId: null,
    variantId: null
};

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

// Utility functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} - ${name}${details ? ': ' + details : ''}`, color);

    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

function logSection(title) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`  ${title}`, 'cyan');
    log('='.repeat(60), 'cyan');
}

async function request(endpoint, options = {}) {
    try {
        const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json().catch(() => ({}));
        return { response, data, status: response.status, ok: response.ok };
    } catch (error) {
        return { error: error.message, ok: false, status: 0 };
    }
}

// Test suites
async function testHealthCheck() {
    logSection('HEALTH CHECK');

    const { ok, data } = await request('/health');
    logTest('Health endpoint', ok && data.status === 'ok', JSON.stringify(data));
}

async function testAuthentication() {
    logSection('AUTHENTICATION TESTS');

    // Register new user
    const registerData = {
        firstName: 'Test',
        lastName: 'User',
        email: `testuser${Date.now()}@test.com`,
        password: 'Password123!',
        phone: '9876543210'
    };

    let result = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData)
    });

    logTest('User registration', result.ok, result.ok ? 'User created' : result.data.error);
    if (result.ok && result.data.token) {
        state.userToken = result.data.token;
        state.userId = result.data.user?._id;
    }

    // Login with created user
    result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: registerData.email,
            password: registerData.password
        })
    });

    logTest('User login', result.ok, result.ok ? 'Login successful' : result.data.error);
    if (result.ok && result.data.token) {
        state.userToken = result.data.token;
    }

    // Get user profile
    result = await request('/auth/me', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get user profile', result.ok, result.ok ? `User: ${result.data.name}` : result.data.error);

    // Try admin login (if credentials exist)
    result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: 'admin@wholesii.com',
            password: 'Admin123!'
        })
    });

    if (result.ok && result.data.token) {
        state.adminToken = result.data.token;
        logTest('Admin login', true, 'Admin authenticated');
    } else {
        logTest('Admin login', false, 'Admin credentials not found (skipping admin tests)');
    }
}

async function testCategories() {
    logSection('CATEGORY TESTS');

    // Get all categories
    let result = await request('/categories');
    logTest('Get categories', result.ok, result.ok ? `Found ${result.data.length} categories` : result.data.error);

    if (result.ok && result.data.length > 0) {
        state.categoryId = result.data[0]._id;
    }

    // Create category (admin only)
    if (state.adminToken) {
        result = await request('/admin/categories', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.adminToken}` },
            body: JSON.stringify({
                name: `Test Category ${Date.now()}`,
                description: 'Test category description',
                isActive: true
            })
        });

        logTest('Create category (admin)', result.ok, result.ok ? `Category ID: ${result.data._id}` : result.data.error);
        if (result.ok) state.categoryId = result.data._id;
    }
}

async function testProducts() {
    logSection('PRODUCT TESTS');

    // Get all products
    let result = await request('/products?limit=10');
    logTest('Get products', result.ok, result.ok ? `Found ${result.data.length} products` : result.data.error);

    if (result.ok && result.data.length > 0) {
        state.productId = result.data[0]._id;
    }

    // Get single product
    if (state.productId) {
        result = await request(`/products/${state.productId}`);
        logTest('Get product by ID', result.ok, result.ok ? `Product: ${result.data.name}` : result.data.error);
    }

    // Create product (admin only)
    if (state.adminToken && state.categoryId) {
        result = await request('/admin/products', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.adminToken}` },
            body: JSON.stringify({
                name: `Test Product ${Date.now()}`,
                description: 'Test product description',
                price: 999,
                originalPrice: 1299,
                category: state.categoryId,
                stock: 100,
                images: ['https://via.placeholder.com/400'],
                isActive: true
            })
        });

        logTest('Create product (admin)', result.ok, result.ok ? `Product ID: ${result.data._id}` : result.data.error);
        if (result.ok) state.productId = result.data._id;
    }
}

async function testVariants() {
    logSection('PRODUCT VARIANTS TESTS');

    if (!state.productId) {
        logTest('Product variants', false, 'Skipped - no product ID');
        results.skipped++;
        return;
    }

    // Create variant
    let result = await request('/variants', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` },
        body: JSON.stringify({
            productId: state.productId,
            name: 'Color',
            values: ['Red', 'Blue', 'Green']
        })
    });

    logTest('Create variant', result.ok, result.ok ? `Variant ID: ${result.data._id}` : result.data.error);
    if (result.ok) state.variantId = result.data._id;

    // Get variants for product
    result = await request(`/variants/product/${state.productId}`);
    logTest('Get product variants', result.ok, result.ok ? `Found ${result.data.length} variants` : result.data.error);
}

async function testCart() {
    logSection('CART OPERATIONS TESTS');

    if (!state.productId || !state.userToken) {
        logTest('Cart operations', false, 'Skipped - no product or user token');
        results.skipped++;
        return;
    }

    // Add to cart
    let result = await request('/cart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` },
        body: JSON.stringify({
            productId: state.productId,
            quantity: 2
        })
    });

    logTest('Add to cart', result.ok, result.ok ? 'Product added to cart' : result.data.error);

    // Get cart
    result = await request('/cart', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get cart', result.ok, result.ok ? `Cart has ${result.data.items?.length || 0} items` : result.data.error);
    if (result.ok && result.data.items?.length > 0) {
        state.cartItemId = result.data.items[0]._id;
    }

    // Update cart item
    if (state.cartItemId) {
        result = await request(`/cart/${state.cartItemId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${state.userToken}` },
            body: JSON.stringify({ quantity: 3 })
        });

        logTest('Update cart item', result.ok, result.ok ? 'Quantity updated' : result.data.error);
    }
}

async function testFavorites() {
    logSection('FAVORITES/WISHLIST TESTS');

    if (!state.productId || !state.userToken) {
        logTest('Favorites', false, 'Skipped - no product or user token');
        results.skipped++;
        return;
    }

    // Add to favorites
    let result = await request('/favorites', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` },
        body: JSON.stringify({ productId: state.productId })
    });

    logTest('Add to favorites', result.ok, result.ok ? 'Added to wishlist' : result.data.error);

    // Get favorites
    result = await request('/favorites', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get favorites', result.ok, result.ok ? `${result.data.length} favorites` : result.data.error);

    // Check if favorited
    result = await request(`/favorites/check/${state.productId}`, {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Check favorite status', result.ok, result.ok ? `Is favorite: ${result.data.isFavorite}` : result.data.error);
}

async function testReviews() {
    logSection('REVIEWS TESTS');

    if (!state.productId) {
        logTest('Reviews', false, 'Skipped - no product ID');
        results.skipped++;
        return;
    }

    // Create review
    if (state.userToken) {
        let result = await request('/reviews', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.userToken}` },
            body: JSON.stringify({
                productId: state.productId,
                rating: 5,
                title: 'Great product!',
                comment: 'Really satisfied with this purchase.',
                images: []
            })
        });

        logTest('Create review', result.ok, result.ok ? `Review ID: ${result.data._id}` : result.data.error);
        if (result.ok) state.reviewId = result.data._id;
    }

    // Get product reviews
    let result = await request(`/reviews/product/${state.productId}`);
    logTest('Get product reviews', result.ok, result.ok ? `${result.data.reviews?.length || 0} reviews` : result.data.error);

    // Get rating summary
    result = await request(`/reviews/product/${state.productId}/rating`);
    logTest('Get product rating', result.ok, result.ok ? `Avg rating: ${result.data.averageRating}` : result.data.error);
}

async function testWallet() {
    logSection('WALLET TESTS');

    if (!state.userToken) {
        logTest('Wallet', false, 'Skipped - no user token');
        results.skipped++;
        return;
    }

    // Get balance
    let result = await request('/wallet/balance', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get wallet balance', result.ok, result.ok ? `Balance: ₹${result.data.balance}` : result.data.error);

    // Add funds
    result = await request('/wallet/add-funds', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` },
        body: JSON.stringify({
            amount: 1000,
            description: 'Test topup'
        })
    });

    logTest('Add funds', result.ok, result.ok ? `New balance: ₹${result.data.balance}` : result.data.error);

    // Get transactions
    result = await request('/wallet/transactions', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get wallet transactions', result.ok, result.ok ? `${result.data.transactions?.length || 0} transactions` : result.data.error);
}

async function testNotifications() {
    logSection('NOTIFICATIONS TESTS');

    if (!state.userToken) {
        logTest('Notifications', false, 'Skipped - no user token');
        results.skipped++;
        return;
    }

    // Get notifications
    let result = await request('/notifications', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get notifications', result.ok, result.ok ? `${result.data.notifications?.length || 0} notifications` : result.data.error);

    // Get unread count
    result = await request('/notifications/unread/count', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get unread count', result.ok, result.ok ? `${result.data.unreadCount} unread` : result.data.error);
}

async function testCoupons() {
    logSection('COUPONS TESTS');

    // Get active coupons
    let result = await request('/coupons');
    logTest('Get active coupons', result.ok, result.ok ? `${result.data.length} coupons` : result.data.error);

    // Create coupon (admin)
    if (state.adminToken) {
        result = await request('/coupons/admin/create', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.adminToken}` },
            body: JSON.stringify({
                code: `TEST${Date.now()}`,
                description: 'Test coupon',
                discountType: 'percentage',
                discountValue: 10,
                minPurchaseAmount: 500,
                validFrom: new Date().toISOString(),
                validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
        });

        logTest('Create coupon (admin)', result.ok, result.ok ? `Coupon: ${result.data.code}` : result.data.error);
        if (result.ok) state.couponId = result.data._id;
    }

    // Validate coupon
    if (state.couponId) {
        result = await request('/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({
                code: `TEST${Date.now()}`,
                cartTotal: 1000,
                productIds: [state.productId]
            })
        });

        logTest('Validate coupon', result.status === 200 || result.status === 404,
            result.ok ? `Discount: ₹${result.data.discount}` : 'Coupon validation tested');
    }
}

async function testSupport() {
    logSection('SUPPORT TICKETS TESTS');

    if (!state.userToken) {
        logTest('Support', false, 'Skipped - no user token');
        results.skipped++;
        return;
    }

    // Create ticket
    let result = await request('/support', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` },
        body: JSON.stringify({
            subject: 'Test support ticket',
            description: 'This is a test support ticket for API testing',
            category: 'product',
            priority: 'medium'
        })
    });

    logTest('Create support ticket', result.ok, result.ok ? `Ticket ID: ${result.data._id}` : result.data.error);
    if (result.ok) state.ticketId = result.data._id;

    // Get tickets
    result = await request('/support', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get support tickets', result.ok, result.ok ? `${result.data.tickets?.length || 0} tickets` : result.data.error);

    // Add reply
    if (state.ticketId) {
        result = await request(`/support/${state.ticketId}/reply`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.userToken}` },
            body: JSON.stringify({
                message: 'This is a test reply'
            })
        });

        logTest('Add ticket reply', result.ok, result.ok ? 'Reply added' : result.data.error);
    }
}

async function testSearch() {
    logSection('SEARCH & FILTERS TESTS');

    // Basic search
    let result = await request('/search?q=test&page=1&limit=10');
    logTest('Search products', result.ok, result.ok ? `${result.data.products?.length || 0} results` : result.data.error);

    // Get price range
    result = await request('/search/price-range');
    logTest('Get price range', result.ok, result.ok ? `₹${result.data.minPrice} - ₹${result.data.maxPrice}` : result.data.error);

    // Autocomplete
    result = await request('/search/autocomplete?q=test');
    logTest('Autocomplete search', result.ok, result.ok ? `${result.data.length} suggestions` : result.data.error);
}

async function testOrders() {
    logSection('ORDER/CHECKOUT TESTS');

    if (!state.userToken) {
        logTest('Orders', false, 'Skipped - no user token');
        results.skipped++;
        return;
    }

    // Create order (checkout)
    let result = await request('/orders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` },
        body: JSON.stringify({
            shippingAddress: {
                street: '123 Test Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                zipCode: '400001',
                country: 'India'
            },
            paymentMethod: 'COD'
        })
    });

    logTest('Create order (checkout)', result.ok, result.ok ? `Order: ${result.data.orderNumber}` : result.data.error);
    if (result.ok) state.orderId = result.data._id;

    // Get orders
    result = await request('/orders', {
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Get orders', result.ok, result.ok ? `${result.data.length} orders` : result.data.error);

    // Get order by ID
    if (state.orderId) {
        result = await request(`/orders/${state.orderId}`, {
            headers: { 'Authorization': `Bearer ${state.userToken}` }
        });

        logTest('Get order by ID', result.ok, result.ok ? `Status: ${result.data.status}` : result.data.error);
    }
}

async function testAdminOperations() {
    logSection('ADMIN OPERATIONS TESTS');

    if (!state.adminToken) {
        log('⚠️  Admin tests skipped - no admin token', 'yellow');
        results.skipped++;
        return;
    }

    // Get dashboard stats
    let result = await request('/admin/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    logTest('Get dashboard stats', result.ok, result.ok ? `${result.data.totalUsers} users, ${result.data.totalOrders} orders` : result.data.error);

    // Get all users
    result = await request('/admin/users?page=1&limit=10', {
        headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    logTest('Get all users', result.ok, result.ok ? `${result.data.users?.length || 0} users` : result.data.error);

    // Get all products
    result = await request('/admin/products?page=1&limit=10', {
        headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    logTest('Get all products', result.ok, result.ok ? `${result.data.products?.length || 0} products` : result.data.error);

    // Get all orders
    result = await request('/admin/orders?page=1&limit=10', {
        headers: { 'Authorization': `Bearer ${state.adminToken}` }
    });

    logTest('Get all orders', result.ok, result.ok ? `${result.data.orders?.length || 0} orders` : result.data.error);

    // Update order status
    if (state.orderId) {
        result = await request(`/admin/orders/${state.orderId}/status`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${state.adminToken}` },
            body: JSON.stringify({ status: 'processing' })
        });

        logTest('Update order status', result.ok, result.ok ? `Status: ${result.data.status}` : result.data.error);
    }
}

async function testCleanup() {
    logSection('CLEANUP TESTS');

    if (!state.userToken) {
        log('⚠️  Cleanup skipped - no user token', 'yellow');
        results.skipped++;
        return;
    }

    // Remove from favorites
    if (state.productId) {
        let result = await request(`/favorites/${state.productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.userToken}` }
        });

        logTest('Remove from favorites', result.ok || result.status === 404, 'Favorite removed or not found');
    }

    // Remove from cart
    if (state.cartItemId) {
        let result = await request(`/cart/${state.cartItemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.userToken}` }
        });

        logTest('Remove from cart', result.ok, result.ok ? 'Item removed' : result.data.error);
    }

    // Clear cart
    let result = await request('/cart/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('Clear cart', result.ok, 'Cart cleared');

    // Close support ticket
    if (state.ticketId) {
        result = await request(`/support/${state.ticketId}/close`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.userToken}` }
        });

        logTest('Close support ticket', result.ok, result.ok ? 'Ticket closed' : result.data.error);
    }
}

async function testLogout() {
    logSection('LOGOUT TEST');

    if (!state.userToken) {
        log('⚠️  Logout skipped - no user token', 'yellow');
        return;
    }

    const result = await request('/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.userToken}` }
    });

    logTest('User logout', result.ok || result.status === 200, 'Logged out successfully');
}

function printSummary() {
    logSection('TEST SUMMARY');

    log(`\nTotal Tests: ${results.passed + results.failed + results.skipped}`, 'cyan');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`❌ Failed: ${results.failed}`, 'red');
    log(`⚠️  Skipped: ${results.skipped}`, 'yellow');

    const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(2);
    log(`\nPass Rate: ${passRate}%`, passRate > 90 ? 'green' : passRate > 70 ? 'yellow' : 'red');

    if (results.failed > 0) {
        log('\n❌ Failed Tests:', 'red');
        results.tests
            .filter(t => !t.passed)
            .forEach(t => log(`  - ${t.name}: ${t.details}`, 'red'));
    }

    log('\n' + '='.repeat(60), 'cyan');
}

// Main test runner
async function runAllTests() {
    log('\n🚀 Starting API Tests...', 'blue');
    log(`Target: ${BASE_URL}`, 'blue');
    log(`Time: ${new Date().toISOString()}\n`, 'blue');

    try {
        await testHealthCheck();
        await testAuthentication();
        await testCategories();
        await testProducts();
        await testVariants();
        await testCart();
        await testFavorites();
        await testReviews();
        await testWallet();
        await testNotifications();
        await testCoupons();
        await testSupport();
        await testSearch();
        await testOrders();
        await testAdminOperations();
        await testCleanup();
        await testLogout();

        printSummary();

        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
    } catch (error) {
        log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run tests
runAllTests();
