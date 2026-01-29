import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { checkActiveUser } from "../middleware/check-active-user.js";

// Import all necessary routes
import authRouter from "./auth.js";
import { paymentRouter } from "./payment.js";
import { healthRouter } from "./health.js";
import invoiceRouter from "./invoice.js";
import * as delhiveryController from "../controllers/delhivery.controller.js";
import * as shippingController from "../controllers/shipping.controller.js";

// Public controllers
import * as publicProductController from "../controllers/public-product.controller.js";
import * as publicCategoryController from "../controllers/public-category.controller.js";

// User controllers
import * as cartController from "../controllers/cart.controller.js";
import * as reviewController from "../controllers/review.controller.js";
import * as favoriteController from "../controllers/favorite.controller.js";
import * as userOrderController from "../controllers/user-order.controller.js";
import * as addressController from "../controllers/address.controller.js";

const router = Router();

// ==================== HEALTH CHECK ====================
router.use(healthRouter);

// ==================== AUTHENTICATION ====================
router.use(authRouter);

// ==================== PAYMENT ====================
router.use(paymentRouter);

// ==================== INVOICES (PUBLIC) ====================
router.use("/invoices", invoiceRouter);

// ==================== PUBLIC ROUTES ====================

// Products
router.get("/products", publicProductController.getProducts);
router.get("/products/slug/:slug", publicProductController.getProductBySlug);
router.get("/products/:productId", publicProductController.getProductById);
router.get("/search", publicProductController.searchProducts);

// Categories
router.get("/categories", publicCategoryController.getCategories);
router.get(
  "/categories/slug/:slug",
  publicCategoryController.getCategoryBySlug,
);
router.get(
  "/categories/:categoryId/products",
  publicCategoryController.getProductsByCategory,
);

// Delhivery (public)
router.post("/delhivery/check-pincode", delhiveryController.checkPincode);
router.post("/delhivery/expected-tat", delhiveryController.getExpectedTat);
router.post(
  "/delhivery/shipping-charges",
  delhiveryController.getShippingCharges,
);
router.get("/delhivery/track/:waybill", delhiveryController.getTracking);

// Shipping calculation
router.post("/shipping/calculate", shippingController.calculateShipping);

// Reviews (public read)
router.get("/products/:productId/reviews", reviewController.getProductReviews);

// ==================== USER ROUTES (AUTH REQUIRED) ====================

// Cart
router.get("/cart", requireAuth, checkActiveUser, cartController.getCart);
router.post("/cart/items", requireAuth, checkActiveUser, cartController.addToCart);
router.put("/cart/items/:itemId", requireAuth, checkActiveUser, cartController.updateCartItem);
router.delete(
  "/cart/items/:itemId",
  requireAuth,
  checkActiveUser,
  cartController.removeFromCart,
);
router.delete("/cart", requireAuth, checkActiveUser, cartController.clearCart);

// Orders
router.post("/orders", requireAuth, checkActiveUser, userOrderController.createOrder);
router.get("/orders", requireAuth, checkActiveUser, userOrderController.getUserOrders);
router.get(
  "/orders/:orderId",
  requireAuth,
  checkActiveUser,
  userOrderController.getOrderDetails,
);
router.delete("/orders/:orderId", requireAuth, checkActiveUser, userOrderController.cancelOrder);

// Addresses
router.get("/addresses", requireAuth, checkActiveUser, addressController.getAddresses);
router.post("/addresses", requireAuth, checkActiveUser, addressController.addAddress);
router.put(
  "/addresses/:addressId",
  requireAuth,
  checkActiveUser,
  addressController.updateAddress,
);
router.delete(
  "/addresses/:addressId",
  requireAuth,
  checkActiveUser,
  addressController.deleteAddress,
);

// Reviews (user actions)
router.post(
  "/products/:productId/reviews",
  requireAuth,
  checkActiveUser,
  reviewController.addReview,
);
router.get("/my-reviews", requireAuth, checkActiveUser, reviewController.getUserReviews);
router.put("/reviews/:reviewId", requireAuth, checkActiveUser, reviewController.updateReview);
router.delete("/reviews/:reviewId", requireAuth, checkActiveUser, reviewController.deleteReview);

// Favorites/Wishlist
router.get("/favorites", requireAuth, checkActiveUser, favoriteController.getFavorites);
router.post("/favorites", requireAuth, checkActiveUser, favoriteController.addToFavorites);
router.delete(
  "/favorites/:productId",
  requireAuth,
  checkActiveUser,
  favoriteController.removeFromFavorites,
);
router.get(
  "/favorites/check/:productId",
  requireAuth,
  checkActiveUser,
  favoriteController.checkFavorite,
);

// Backward compatibility for wishlist endpoints (REDUNDANT - KEPT FOR COMPATIBILITY ONLY)
router.get("/wishlist", requireAuth, checkActiveUser, favoriteController.getFavorites);
router.post("/wishlist", requireAuth, checkActiveUser, favoriteController.addToFavorites);
router.delete(
  "/wishlist/:productId",
  requireAuth,
  checkActiveUser,
  favoriteController.removeFromFavorites,
);

export default router;
