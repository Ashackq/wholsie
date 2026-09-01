/**
 * Offer Engine — server/src/services/offerEngine.ts
 *
 * Principles (from implementation plan):
 *  - Automatic: auto-applied whenever cart is evaluated. No customer action.
 *  - No stacking: exactly ONE offer wins per cart evaluation.
 *  - Winner = highest discountAmount; ties broken by priority (higher wins).
 *  - Fully server-side: called from getCart() and createOrder().
 *  - In-process cache: active offers cached for 1 minute, invalidated on admin writes.
 */

import { Types } from "mongoose";
import { Offer } from "../models/Offer.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
    _id?: any;
    productId: Types.ObjectId | string;
    variantId?: string;
    name?: string;
    price?: number;       // frontend price (ignored for discount calc — we use DB price)
    quantity: number;
    image?: string;
    // Populated from DB during evaluation:
    dbPrice?: number;     // salePrice || price from DB
    dbWeight?: number;    // weight from DB (default 100g)
    categoryId?: Types.ObjectId | string;
    stock?: number;       // current stock (for OOS check on free items)
}

export interface FreeItem {
    productId: Types.ObjectId | string;
    productName: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;    // price of the item (for display; order saves it at ₹0)
    isOutOfStock: boolean;
}

export interface AvailableOffer {
    offerId: Types.ObjectId | string;
    offerTitle: string;
    offerSlug: string;
    discountAmount: number;
    description?: string;
    badgeText?: string;
    ruleType?: string;
    freeItemsPreview?: FreeItem[];
    freeShipping?: boolean;
}

export interface OfferResult {
    availableOffer: AvailableOffer | null;
    isOfferAvailed: boolean;
    appliedOffer: {
        offerId: Types.ObjectId | string;
        offerTitle: string;
        offerSlug: string;
        discountAmount: number;
    } | null;
    offerDiscount: number;
    freeItems: FreeItem[];
    warnings: string[];
    /** true if free_shipping offer won and is availed — caller must set shippingCost = 0 */
    freeShipping: boolean;
}

// ── In-process cache ──────────────────────────────────────────────────────────

interface OfferCacheEntry {
    offers: any[];
    fetchedAt: number; // ms timestamp
}

let _cache: OfferCacheEntry | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

/** Call this after any admin create/update/delete of an Offer document. */
export function invalidateOfferCache(): void {
    _cache = null;
}

async function getActiveOffers(): Promise<any[]> {
    const now = Date.now();

    if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
        return _cache.offers;
    }

    const nowDate = new Date();
    const offers = await Offer.find({
        isActive: true,
        $or: [{ startDate: null }, { startDate: { $lte: nowDate } }],
        $and: [
            { $or: [{ endDate: null }, { endDate: { $gte: nowDate } }] },
        ],
    })
        .populate("applicableProducts", "_id categoryId salePrice price weight stock name image")
        .populate("applicableCategories", "_id")
        .populate("rule.getFreeProductId", "_id name salePrice price weight stock image")
        .populate("rule.comboProducts", "_id categoryId salePrice price weight stock image")
        .lean();

    // Further filter: respect maxUsageTotal
    const valid = offers.filter(
        (o) => o.maxUsageTotal == null || o.usageCount < o.maxUsageTotal
    );

    _cache = { offers: valid, fetchedAt: now };
    return valid;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function productIdStr(id: any): string {
    return id?.toString() ?? "";
}

/** Returns the effective DB price of a product document */
function productPrice(p: any): number {
    return p.salePrice ?? p.price ?? 0;
}

/** Returns DB items that match the offer's scope (products / categories / cart-wide) */
function eligibleItems(offer: any, cartItems: CartItem[]): CartItem[] {
    const appProducts: string[] = (offer.applicableProducts ?? []).map((p: any) =>
        productIdStr(p._id ?? p)
    );
    const appCategories: string[] = (offer.applicableCategories ?? []).map((c: any) =>
        productIdStr(c._id ?? c)
    );

    if (appProducts.length === 0 && appCategories.length === 0) {
        // Cart-wide scope
        return cartItems;
    }

    return cartItems.filter((item) => {
        const pid = productIdStr(item.productId);
        const cid = productIdStr(item.categoryId);
        if (appProducts.length > 0 && appProducts.includes(pid)) return true;
        if (appCategories.length > 0 && appCategories.includes(cid)) return true;
        return false;
    });
}

// ── Rule evaluators ───────────────────────────────────────────────────────────

interface EvalResult {
    discountAmount: number;
    rankingValue: number;
    freeItems: FreeItem[];
    warnings: string[];
    freeShipping: boolean;
}

const ZERO_RESULT: EvalResult = {
    discountAmount: 0,
    rankingValue: 0,
    freeItems: [],
    warnings: [],
    freeShipping: false,
};

function evalBuyXGetYFree(offer: any, eligible: CartItem[]): EvalResult {
    const { buyQuantity, getQuantity, getFreeProductId } = offer.rule;
    if (!buyQuantity || !getQuantity) return ZERO_RESULT;

    // Total eligible quantity purchased
    const totalQty = eligible.reduce((s, i) => s + i.quantity, 0);
    if (totalQty < buyQuantity) return ZERO_RESULT;

    // How many "get" sets are triggered
    const sets = Math.floor(totalQty / buyQuantity);
    const freeQty = sets * getQuantity;

    let freeProductDoc: any = null;
    let freeProductId: string;
    let freeProductName: string;
    let freeProductImage: string = "";
    let freeUnitPrice: number;
    let isOutOfStock = false;

    if (getFreeProductId) {
        // Different free product specified
        freeProductDoc = getFreeProductId; // populated
        freeProductId = productIdStr(freeProductDoc._id);
        freeProductName = freeProductDoc.name ?? "Free Item";
        freeProductImage = freeProductDoc.image ?? "";
        freeUnitPrice = productPrice(freeProductDoc);
        isOutOfStock = (freeProductDoc.stock ?? freeProductDoc.quantity ?? 0) <= 0;
    } else {
        // Free item = cheapest eligible item in cart
        const sorted = [...eligible].sort((a, b) => (a.dbPrice ?? 0) - (b.dbPrice ?? 0));
        const cheapest = sorted[0];
        freeProductId = productIdStr(cheapest.productId);
        freeProductName = cheapest.name ?? "Free Item";
        freeProductImage = cheapest.image ?? "";
        freeUnitPrice = cheapest.dbPrice ?? 0;
        isOutOfStock = (cheapest.stock ?? 0) <= 0;
    }

    const freeItemValue = freeQty * freeUnitPrice;
    const warnings: string[] = [];
    if (isOutOfStock) {
        warnings.push(
            `${freeProductName} is currently out of stock. It will be added to your order when available.`
        );
    }

    return {
        discountAmount: 0, // Free items are awarded at ₹0.00, not as a cash reduction from the paid items subtotal
        rankingValue: freeItemValue,
        freeItems: [
            {
                productId: freeProductId,
                productName: freeProductName,
                productImage: freeProductImage,
                quantity: freeQty,
                unitPrice: freeUnitPrice,
                isOutOfStock,
            },
        ],
        warnings,
        freeShipping: false,
    };
}

function evalPercentageDiscount(offer: any, eligible: CartItem[]): EvalResult {
    const { discountValue, maxDiscountAmount } = offer.rule;
    if (!discountValue) return ZERO_RESULT;
    if (eligible.length === 0) return ZERO_RESULT;

    const eligibleSubtotal = eligible.reduce(
        (s, i) => s + (i.dbPrice ?? 0) * i.quantity,
        0
    );
    let discountAmount = (discountValue / 100) * eligibleSubtotal;
    if (maxDiscountAmount && discountAmount > maxDiscountAmount) {
        discountAmount = maxDiscountAmount;
    }

    return { discountAmount, rankingValue: discountAmount, freeItems: [], warnings: [], freeShipping: false };
}

function evalFixedDiscount(offer: any, eligible: CartItem[]): EvalResult {
    const { discountValue } = offer.rule;
    if (!discountValue) return ZERO_RESULT;
    if (eligible.length === 0) return ZERO_RESULT;

    const eligibleSubtotal = eligible.reduce(
        (s, i) => s + (i.dbPrice ?? 0) * i.quantity,
        0
    );
    const discountAmount = Math.min(discountValue, eligibleSubtotal);
    return { discountAmount, rankingValue: discountAmount, freeItems: [], warnings: [], freeShipping: false };
}

function evalComboDiscount(offer: any, cartItems: CartItem[]): EvalResult {
    const { comboProducts, comboPrice } = offer.rule;
    if (!comboProducts?.length || comboPrice == null) return ZERO_RESULT;

    const comboIds: string[] = comboProducts.map((p: any) => productIdStr(p._id ?? p));

    // All combo products must be in the cart
    for (const cid of comboIds) {
        const found = cartItems.find((i) => productIdStr(i.productId) === cid);
        if (!found) return ZERO_RESULT;
    }

    // Eligible subtotal = sum of combo products' prices in cart
    const eligibleSubtotal = cartItems
        .filter((i) => comboIds.includes(productIdStr(i.productId)))
        .reduce((s, i) => s + (i.dbPrice ?? 0) * i.quantity, 0);

    const discountAmount = Math.max(0, eligibleSubtotal - comboPrice);
    return { discountAmount, rankingValue: discountAmount, freeItems: [], warnings: [], freeShipping: false };
}

function evalMinimumCartDiscount(
    offer: any,
    cartItems: CartItem[],
    cartSubtotal: number
): EvalResult {
    const { minimumCartValue, minimumCartDiscountType, discountValue, maxDiscountAmount } =
        offer.rule;
    if (!minimumCartValue || !discountValue) return ZERO_RESULT;
    if (cartSubtotal < minimumCartValue) return ZERO_RESULT;

    let discountAmount: number;
    if (minimumCartDiscountType === "percentage") {
        discountAmount = (discountValue / 100) * cartSubtotal;
        if (maxDiscountAmount && discountAmount > maxDiscountAmount) {
            discountAmount = maxDiscountAmount;
        }
    } else {
        discountAmount = Math.min(discountValue, cartSubtotal);
    }

    return { discountAmount, rankingValue: discountAmount, freeItems: [], warnings: [], freeShipping: false };
}

function evalFreeShipping(offer: any, eligible: CartItem[]): EvalResult {
    // For cart-wide free shipping, eligible = all cart items (handled by eligibleItems())
    if (eligible.length === 0) return ZERO_RESULT;

    return {
        discountAmount: 0, // shipping = 0 is handled separately via freeShipping flag
        rankingValue: 50,
        freeItems: [],
        warnings: [],
        freeShipping: true,
    };
}

// ── Main evaluate function ────────────────────────────────────────────────────

/**
 * Evaluate all active offers against the given cart items.
 *
 * `cartItems` must have `dbPrice`, `dbWeight`, `categoryId`, and `stock` pre-populated
 * from the database (call enrichCartItems() before this).
 *
 * `userId` — when provided, maxUsagePerUser is enforced by querying past completed orders.
 *
 * Returns the winning offer (single best) plus any free items.
 */
export async function evaluateOffers(
    cartItems: CartItem[],
    isOfferAvailed: boolean = false,
    userId?: Types.ObjectId | string | null
): Promise<OfferResult> {
    if (!cartItems.length) {
        return {
            availableOffer: null,
            isOfferAvailed: false,
            appliedOffer: null,
            offerDiscount: 0,
            freeItems: [],
            warnings: [],
            freeShipping: false,
        };
    }

    const offers = await getActiveOffers();
    const cartSubtotal = cartItems.reduce(
        (s, i) => s + (i.dbPrice ?? 0) * i.quantity,
        0
    );

    // ── Pre-compute per-user usage counts for offers with maxUsagePerUser ──────
    // Only run DB queries when we have a userId and at least one offer has the limit set.
    const offersWithPerUserLimit = userId
        ? offers.filter((o) => o.maxUsagePerUser != null && o.maxUsagePerUser > 0)
        : [];

    const perUserUsageMap = new Map<string, number>(); // offerId → count for this user

    if (offersWithPerUserLimit.length > 0 && userId) {
        // Batch query: find all completed orders for this user that used any of these offers
        const offerIds = offersWithPerUserLimit.map((o: any) => o._id);
        const usedOrders = await Order.find({
            userId,
            "appliedOffers.offerId": { $in: offerIds },
            paymentStatus: "completed",
        })
            .select("appliedOffers")
            .lean();

        for (const order of usedOrders) {
            for (const ao of (order as any).appliedOffers ?? []) {
                const key = ao.offerId?.toString();
                if (key) {
                    perUserUsageMap.set(key, (perUserUsageMap.get(key) ?? 0) + 1);
                }
            }
        }
    }

    interface Candidate {
        offer: any;
        result: EvalResult;
    }

    const candidates: Candidate[] = [];

    for (const offer of offers) {
        // ── Per-user limit check ───────────────────────────────────────────────
        if (userId && offer.maxUsagePerUser != null && offer.maxUsagePerUser > 0) {
            const usedCount = perUserUsageMap.get(offer._id.toString()) ?? 0;
            if (usedCount >= offer.maxUsagePerUser) {
                // This user has already exhausted their limit — skip as a candidate
                continue;
            }
        }

        const eligible = eligibleItems(offer, cartItems);
        let result: EvalResult;

        switch (offer.rule.type) {
            case "buy_x_get_y_free":
                result = evalBuyXGetYFree(offer, eligible);
                break;
            case "percentage_discount":
                result = evalPercentageDiscount(offer, eligible);
                break;
            case "fixed_discount":
                result = evalFixedDiscount(offer, eligible);
                break;
            case "combo_discount":
                result = evalComboDiscount(offer, cartItems);
                break;
            case "minimum_cart_discount":
                result = evalMinimumCartDiscount(offer, cartItems, cartSubtotal);
                break;
            case "free_shipping":
                result = evalFreeShipping(offer, eligible);
                break;
            default:
                continue;
        }

        if (result.discountAmount > 0 || result.freeItems.length > 0 || result.freeShipping) {
            candidates.push({ offer, result });
        }
    }

    if (!candidates.length) {
        return {
            availableOffer: null,
            isOfferAvailed: false,
            appliedOffer: null,
            offerDiscount: 0,
            freeItems: [],
            warnings: [],
            freeShipping: false,
        };
    }

    // Sort: highest rankingValue first, then highest priority as tiebreaker
    candidates.sort((a, b) => {
        if (b.result.rankingValue !== a.result.rankingValue) {
            return b.result.rankingValue - a.result.rankingValue;
        }
        return (b.offer.priority ?? 0) - (a.offer.priority ?? 0);
    });

    const winner = candidates[0];

    const availableOffer: AvailableOffer = {
        offerId: winner.offer._id,
        offerTitle: winner.offer.title,
        offerSlug: winner.offer.slug,
        discountAmount: winner.result.discountAmount,
        description: winner.offer.description || "",
        badgeText: winner.offer.badgeText || "",
        ruleType: winner.offer.rule?.type,
        freeItemsPreview: winner.result.freeItems,
        freeShipping: winner.result.freeShipping,
    };

    if (!isOfferAvailed) {
        return {
            availableOffer,
            isOfferAvailed: false,
            appliedOffer: null,
            offerDiscount: 0,
            freeItems: [],
            warnings: [],
            freeShipping: false,
        };
    }

    return {
        availableOffer,
        isOfferAvailed: true,
        appliedOffer: {
            offerId: winner.offer._id,
            offerTitle: winner.offer.title,
            offerSlug: winner.offer.slug,
            discountAmount: winner.result.discountAmount,
        },
        offerDiscount: winner.result.discountAmount,
        freeItems: winner.result.freeItems,
        warnings: winner.result.warnings,
        freeShipping: winner.result.freeShipping,
    };
}

// ── Cart item enrichment helper ───────────────────────────────────────────────

/**
 * Enriches cart items with DB prices, weights, categoryId, and stock.
 * This must be called before evaluateOffers() so the engine uses server-side data.
 *
 * Returns a new array of CartItem with dbPrice, dbWeight, categoryId, and stock set.
 */
export async function enrichCartItems(
    rawItems: Array<{
        _id?: any;
        productId: Types.ObjectId | string;
        variantId?: string;
        name?: string;
        price?: number;
        quantity: number;
        image?: string;
    }>
): Promise<CartItem[]> {
    if (!rawItems.length) return [];

    const productIds = rawItems
        .map((i) => (typeof i.productId === "object" && (i.productId as any)?._id ? (i.productId as any)._id : i.productId))
        .filter(Boolean);

    const products = await Product.find({ _id: { $in: productIds } })
        .select("_id name salePrice price weight categoryId stock quantity image")
        .lean();

    const productMap = new Map<string, any>(
        products.map((p) => [p._id.toString(), p])
    );

    return rawItems.map((item) => {
        const rawPid = typeof item.productId === "object" && (item.productId as any)?._id ? (item.productId as any)._id : item.productId;
        const pidStr = rawPid?.toString?.() ?? "";
        const p = productMap.get(pidStr);
        return {
            ...item,
            _id: item._id ? item._id.toString() : undefined,
            productId: pidStr || item.productId,
            image: item.image || p?.image || "",
            dbPrice: p ? (p.salePrice ?? p.price ?? 0) : (item.price ?? 0),
            dbWeight: p ? (p.weight ?? 100) : 100,
            categoryId: p?.categoryId,
            stock: p ? (p.stock ?? p.quantity ?? 0) : 0,
            name: item.name ?? p?.name ?? "Product",
        };
    });
}
