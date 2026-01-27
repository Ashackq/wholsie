import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as categoryController from '../controllers/category.controller.js';
import * as productController from '../controllers/product.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as delhiveryController from '../controllers/delhivery.controller.js';

const router = Router();

// ==================== AUTH CHECK ====================
router.get('/check', requireAuth, requireAdmin, (req, res) => {
    res.json({
        success: true,
        isAdmin: true,
        user: (req as any).user,
    });
});

// ==================== DASHBOARD ====================
router.get('/dashboard', requireAuth, requireAdmin, orderController.getDashboardStats);

// ==================== CATEGORIES ====================
router.get('/categories', requireAuth, requireAdmin, categoryController.getCategories);
router.post('/categories', requireAuth, requireAdmin, categoryController.createCategory);
router.put('/categories/:categoryId', requireAuth, requireAdmin, categoryController.updateCategory);
router.delete('/categories/:categoryId', requireAuth, requireAdmin, categoryController.deleteCategory);

// ==================== PRODUCTS ====================
router.get('/products', requireAuth, requireAdmin, productController.getProducts);
router.get('/products/:productId', requireAuth, requireAdmin, productController.getProduct);
router.post('/products', requireAuth, requireAdmin, productController.createProduct);
router.put('/products/:productId', requireAuth, requireAdmin, productController.updateProduct);
router.delete('/products/:productId', requireAuth, requireAdmin, productController.deleteProduct);

// ==================== ORDERS ====================
router.get('/orders', requireAuth, requireAdmin, orderController.getOrders);
router.get('/orders/:orderId', requireAuth, requireAdmin, orderController.getOrder);
router.put('/orders/:orderId/status', requireAuth, requireAdmin, orderController.updateOrderStatus);

// ==================== DELHIVERY ====================
router.post('/delhivery/create-shipment', requireAuth, requireAdmin, delhiveryController.createShipment);
router.post('/delhivery/cancel-shipment', requireAuth, requireAdmin, delhiveryController.cancelShipment);
router.post('/delhivery/check-pincode', requireAuth, requireAdmin, delhiveryController.checkPincode);
router.get('/delhivery/tracking/:waybill', requireAuth, requireAdmin, delhiveryController.getTracking);

export default router;
