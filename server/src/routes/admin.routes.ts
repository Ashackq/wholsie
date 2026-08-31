import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as categoryController from '../controllers/category.controller.js';
import * as productController from '../controllers/product.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as delhiveryController from '../controllers/delhivery.controller.js';
import * as userController from '../controllers/user.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as adminOfferController from '../controllers/admin-offer.controller.js';
import * as adminCouponController from '../controllers/admin-coupon.controller.js';
import * as adminMediaController from '../controllers/admin-media.controller.js';

const router = Router();
import * as uploadController from '../controllers/upload.controller.js';

// ==================== FILE UPLOAD ====================
router.post('/upload', requireAuth, requireAdmin, uploadController.upload.single('file'), uploadController.uploadFile);

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

// ==================== USERS ====================
router.get('/users', requireAuth, requireAdmin, userController.getUsers);
router.get('/users/:userId', requireAuth, requireAdmin, userController.getUser);
router.put('/users/:userId/status', requireAuth, requireAdmin, userController.updateUserStatus);
router.get('/users/:userId/cart', requireAuth, requireAdmin, userController.getUserCart);
router.get('/users/:userId/orders', requireAuth, requireAdmin, userController.getUserOrders);
router.get('/users/:userId/addresses', requireAuth, requireAdmin, userController.getUserAddresses);

// ==================== DELHIVERY ====================
router.post('/delhivery/create-shipment', requireAuth, requireAdmin, delhiveryController.createShipment);
router.post('/delhivery/cancel-shipment', requireAuth, requireAdmin, delhiveryController.cancelShipment);
router.post('/delhivery/check-pincode', requireAuth, requireAdmin, delhiveryController.checkPincode);
router.get('/delhivery/tracking/:waybill', requireAuth, requireAdmin, delhiveryController.getTracking);

// ==================== REVIEWS ====================
router.get('/reviews', requireAuth, requireAdmin, reviewController.getPendingReviews);
router.put('/reviews/:reviewId/approve', requireAuth, requireAdmin, reviewController.approveReview);
router.put('/reviews/:reviewId/reject', requireAuth, requireAdmin, reviewController.rejectReview);

// ==================== OFFERS ====================
router.get('/offers', requireAuth, requireAdmin, adminOfferController.getOffers);
router.get('/offers/:offerId', requireAuth, requireAdmin, adminOfferController.getOffer);
router.post('/offers', requireAuth, requireAdmin, adminOfferController.createOffer);
router.put('/offers/:offerId', requireAuth, requireAdmin, adminOfferController.updateOffer);
router.patch('/offers/:offerId/toggle-active', requireAuth, requireAdmin, adminOfferController.toggleOfferActive);
router.delete('/offers/:offerId', requireAuth, requireAdmin, adminOfferController.deleteOffer);

// ==================== COUPONS ====================
router.get('/coupons', requireAuth, requireAdmin, adminCouponController.getCoupons);
router.get('/coupons/:couponId', requireAuth, requireAdmin, adminCouponController.getCoupon);
router.post('/coupons', requireAuth, requireAdmin, adminCouponController.createCoupon);
router.put('/coupons/:couponId', requireAuth, requireAdmin, adminCouponController.updateCoupon);
router.patch('/coupons/:couponId/toggle-active', requireAuth, requireAdmin, adminCouponController.toggleCouponActive);
router.delete('/coupons/:couponId', requireAuth, requireAdmin, adminCouponController.deleteCoupon);

// ==================== HOMEPAGE MEDIA ====================
// POST and PUT use uploadMedia (50 MB limit) with two optional file fields: file + thumbnail
router.get('/media', requireAuth, requireAdmin, adminMediaController.getMediaItems);
router.get('/media/:mediaId', requireAuth, requireAdmin, adminMediaController.getMediaItem);
router.post(
  '/media',
  requireAuth,
  requireAdmin,
  uploadController.uploadMedia.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  adminMediaController.createMediaItem,
);
router.put(
  '/media/:mediaId',
  requireAuth,
  requireAdmin,
  uploadController.uploadMedia.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  adminMediaController.updateMediaItem,
);
router.patch('/media/:mediaId/toggle-active', requireAuth, requireAdmin, adminMediaController.toggleMediaActive);
router.delete('/media/:mediaId', requireAuth, requireAdmin, adminMediaController.deleteMediaItem);

export default router;
