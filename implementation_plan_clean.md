# Implementation Plan: Offers, Media Sections & Checkout Enhancements — Wholesiii

> **Decision Log (confirmed 2026-08-31)**
>
> - Q1: No stacking — only the single best offer applies per cart. Cart **auto-detects** applicable offers (no customer activation).
> - Q2: Guest checkout not supported — login required via inline OTP modal.
> - Q3: Free product OOS — offer applied with warning.
> - Q4: Local disk only — no CDN.
> - Q5: OTP store unchanged.
> - Q6: ALL computation server-side: price, quantity, shipping, boxes, weights, offers, coupons.
> - Coupon codes: product/category scoped. **CANNOT combine with active offers.**

---

## 1. Executive Summary

Stack:

- **Frontend**: Next.js 14 (App Router), TypeScript, Vanilla CSS — src/
- **Backend**: Express.js, TypeScript, MongoDB + Mongoose, JWT auth — server/src/
- **Auth**: Mobile OTP in-memory store. No email/password.
- **Cart**: Guest = localStorage. Authenticated = MongoDB.
- **Upload**: Local multer to public/assets/uploaded/. No CDN.
- **Coupons**: models/Coupon.ts schema is solid. Logic is couponAmount = 0 (TODO). Being fully implemented.
- **Offers**: Zero infrastructure. Built from scratch.
- **Video/GIF**: Does not exist.

**Build Plan:**

1. Extensible **Offer Engine** — server-side, auto-applies to eligible cart items, single best offer wins.
2. **Coupon Engine** — server-side, product/category scoped, mutually exclusive with offers.
3. **Full server-side computation** of ALL values (price, shipping, boxes, weight, discounts, netAmount).
4. **HomepageMedia model** — admin-driven video/GIF section.
5. Offers virtual filter tab on Products page.
6. /offers/[slug] shareable pages with SEO.
7. Inline OTP modal at checkout (replaces hard redirect).

---

## 2. Current Architecture

### Backend

| File                                 | Relevance                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| models/Product.ts                    | name, price, salePrice, categoryId, weight, status.                                                                                              |
| models/Cart.ts                       | userId required. couponCode, discount. Guest carts NOT in DB.                                                                                    |
| models/Coupon.ts                     | Full schema — code, discountType, discountValue, maxDiscount, applicableProducts, applicableCategories, validFrom/To, usageLimit. Logic missing. |
| models/Order.ts                      | subtotal, shippingCost, discount, total. No offer reference.                                                                                     |
| controllers/user-order.controller.ts | Trusts frontendShippingCost (security risk). couponAmount = 0 (TODO).                                                                            |
| utils/orderWeightCalculator.ts       | Exists — weight/box calculator. Must be called server-side.                                                                                      |
| controllers/upload.controller.ts     | Multer, local disk, 5MB, images only.                                                                                                            |

### Frontend

| File                  | Relevance                                                           |
| --------------------- | ------------------------------------------------------------------- |
| app/page.tsx          | Hero slider (hardcoded). No video/GIF.                              |
| app/products/page.tsx | Filter by ?category=slug. No Offers tab.                            |
| app/cart/page.tsx     | Guest + logged-in cart. No offer display. Hard-redirects to /login. |
| app/checkout/page.tsx | Hard-redirects to /login. Coupon UI non-functional.                 |
| lib/guest-cart.ts     | localStorage guest cart (add/update/remove).                        |

---

## 3. Server-Side Computation Policy (Q6)

> [!IMPORTANT]
> **ALL of the following are computed server-side. Frontend values are IGNORED.**

| Computation     | How                                                                   |
| --------------- | --------------------------------------------------------------------- | --- | ----------------- | --- | --------------------- |
| Product price   | variant.price                                                         |     | product.salePrice |     | product.price from DB |
| Item subtotal   | price × quantity computed in offerEngine                              |
| Product weight  | product.weight from DB (default 100g if missing)                      |
| Total weight    | Σ(weight × quantity)                                                  |
| Box selection   | utils/orderWeightCalculator.ts (existing utility)                     |
| Shipping cost   | Delhivery API or weight-based fallback — frontendShippingCost IGNORED |
| Offer discount  | offerEngine.evaluate() — auto-detected, no customer action            |
| Coupon discount | couponEngine.apply() — customer code; BLOCKED if offer active         |
| Net amount      | subtotal + shipping - offerDiscount - couponDiscount                  |
| Razorpay amount | order.netAmount from DB — already correct, unchanged                  |

---

## 4. NEW: Offer Model — server/src/models/Offer.ts

`typescript
const offerRuleSchema = new Schema({
type: {
type: String,
enum: [
'buy_x_get_y_free',
'percentage_discount',
'fixed_discount',
'combo_discount',
'minimum_cart_discount',
'free_shipping',
],
required: true,
},
// buy_x_get_y_free
buyQuantity: Number,
getQuantity: Number,
getFreeProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
// null = same product; set to specific productId for a different free item

// percentage / fixed
discountValue: Number,
maxDiscountAmount: Number, // cap for percentage offers

// combo
comboProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
comboPrice: Number,

// minimum_cart_discount
minimumCartValue: Number,
minimumCartDiscountType: { type: String, enum: ['percentage', 'fixed'] },
}, { \_id: false });

const offerSchema = new Schema({
title: { type: String, required: true },
description: String,
slug: { type: String, required: true, unique: true, lowercase: true },
internalNote: String, // admin-only
image: String,
images: [String],
badgeText: String, // e.g. HOT DEAL
ctaText: { type: String, default: 'Shop Now' },
termsAndConditions: String,
rule: { type: offerRuleSchema, required: true },
applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'ProductCategory' }],
// Both empty = cart-wide (for cart-minimum and free-shipping only)
isActive: { type: Boolean, default: false },
startDate: Date,
endDate: Date,
displayOnProductsPage: { type: Boolean, default: true },
displayOnHomepage: { type: Boolean, default: false },
priority: { type: Number, default: 0 }, // tiebreaker: higher wins
maxUsageTotal: Number,
maxUsagePerUser: Number,
usageCount: { type: Number, default: 0 },
viewCount: { type: Number, default: 0 },
clickCount: { type: Number, default: 0 },
addToCartCount: { type: Number, default: 0 },
metaTitle: String,
metaDescription: String,
}, { timestamps: true });

// isCurrentlyActive (runtime check, not stored):
// isActive=true AND (startDate null OR <= now) AND (endDate null OR >= now)
// AND (maxUsageTotal null OR usageCount < maxUsageTotal)
`

---

## 5. Offer Engine — server/src/services/offerEngine.ts

### Principles

- **Automatic** — no customer action. Auto-applied whenever cart is evaluated.
- **No stacking** — exactly one offer wins.
- **Winner** = highest discountAmount; ties broken by priority (higher wins).
- **Fully server-side** — called from getCart() and createOrder().

### Rule Behaviour

| Rule                  | Trigger                                         | Discount                                                             |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| buy_x_get_y_free      | Cart has ≥ buyQuantity eligible items           | getQuantity × price of cheapest eligible (or specified free product) |
| percentage_discount   | Any eligible items in cart                      | discountValue% of eligible subtotal, capped by maxDiscountAmount     |
| fixed_discount        | Any eligible items in cart                      | discountValue flat (capped at eligible subtotal)                     |
| combo_discount        | ALL comboProducts in cart                       | eligibleSubtotal - comboPrice                                        |
| minimum_cart_discount | cartSubtotal >= minimumCartValue                | discountValue as minimumCartDiscountType on cart total               |
| free_shipping         | Any eligible items (or empty scope = cart-wide) | shipping = 0                                                         |

### Algorithm

`

1. Fetch active offers (in-process cache, 1-min TTL, invalidated on admin write)
2. For each offer:
   a. Find eligible cart items
   b. Check condition (qty, cart value, combo completeness)
   c. Calculate discountAmount this offer would produce
3. Sort eligible offers: discountAmount DESC, priority DESC
4. Winner = first entry (single best offer)
5. Return { appliedOffer, offerDiscount, freeItems }
   `

### Free Items

- NOT added to cart document (race condition risk)
- Returned in API response as freeItems[]
- On order creation: added to orderItems with price: 0
- If product.stock == 0: isOutOfStock: true, warning added, order still proceeds

---

## 6. Coupon Engine — server/src/services/couponEngine.ts

### Existing Coupon Model (add 1 field)

`typescript
// Existing: code, discountType, discountValue, maxDiscount, minPurchaseAmount,
// applicableProducts, applicableCategories, excludedProducts,
// validFrom, validTo, usageLimit, usagePerUser, usageCount, isActive

// ADD:
cannotCombineWithOffers: { type: Boolean, default: true },
`

### Validation Steps

`

1. Normalise to UPPERCASE
2. Find: isActive=true, validFrom<=now, validTo>=now
3. If not found → Invalid or expired coupon code
4. usageCount >= usageLimit → Coupon usage limit reached
5. Orders with this couponCode for userId >= usagePerUser → Coupon already used
6. MUTUAL EXCLUSION: if offerDiscount > 0 → Cannot combine coupon with active offer
7. Eligible items:
   - applicableProducts non-empty → items matching productId
   - else applicableCategories non-empty → items matching categoryId
   - else → all items
   - subtract excludedProducts
8. eligibleSubtotal = Σ(eligible item totals)
9. eligibleSubtotal < minPurchaseAmount → Minimum purchase of ₹X required
10. Discount:
    - percentage: (discountValue/100) × eligibleSubtotal, capped by maxDiscount
    - fixed: min(discountValue, eligibleSubtotal)
11. Return { couponId, code, discountAmount, eligibleSubtotal }
    `

### Mutual Exclusion Behaviour

When offer auto-applied after coupon was set:
`json
{
  appliedCoupon: null,
  warnings: [Your coupon ABCDEF was removed because a better promotional offer is now active.]
}
`

---

## 7. Full Server-Side Order Computation

Steps in createOrder (server/src/controllers/user-order.controller.ts):

`

1. FETCH: Cart.populate('items.productId')
2. PRICES from DB: variant.price || salePrice || price per item
3. WEIGHT from DB: product.weight || 100 per item
4. SUBTOTAL: Σ(price × quantity)
5. TOTAL WEIGHT: Σ(weight × quantity)
6. BOXES: utils/orderWeightCalculator.ts
7. SHIPPING: Delhivery API or weight-based fallback (frontendShippingCost IGNORED)
8. OFFER: offerEngine.evaluate() → offerDiscount, freeItems (added at price:0)
9. COUPON: if couponCode in body AND offerDiscount == 0 → couponEngine.apply()
10. NET: subtotal + shipping - offerDiscount - couponDiscount (min 1)
11. SAVE ORDER with full snapshot: prices, weights, appliedOffers, appliedCoupon
12. INCREMENT: offer.usageCount++ and coupon.usageCount++ (atomic )
13. RETURN: { netAmount, warnings[] }
    `

---

## 8. Cart Enriched Response

GET /api/cart now returns:

`json
{
  items: [...],
  subtotal: 500,
  offerDiscount: 150,
  couponDiscount: 0,
  adjustedSubtotal: 350,
  shippingEstimate: 0,
  appliedOffers: [{ offerId: ..., offerTitle: Buy 2 Puffs & Get 1 Free, discountAmount: 150 }],
  freeItems: [{ productId: ..., productName: Jowar Puffs, quantity: 1, isOutOfStock: false }],
  appliedCoupon: null,
  couponMessage: null,
  warnings: []
}
`

Customer never needs to activate an offer — if they add 2 eligible puffs, the discount appears automatically.

---

## 9. Coupon + Offer UI Flow (Cart Page)

When offer is active:
`[🎁 Buy 2 Puffs & Get 1 Free applied — Save ₹150]
[Have a coupon? ___ABCDEF___ [Apply]]
→ Server: Coupon codes cannot be combined with active offers.`

When no offer is active:
`[Have a coupon? ___ABCDEF___ [Apply]]
→ Server: Coupon ABCDEF applied! ₹50 off on eligible items.`

---

## 10. Admin Panel Changes

### Updated Sidebar — src/app/admin/layout.tsx

`typescript
{ href: /admin/offers,  label: Offers,         icon: fas fa-tag },
{ href: /admin/coupons, label: Coupons,         icon: fas fa-ticket-alt },
{ href: /admin/media,   label: Homepage Media,  icon: fas fa-photo-video },
`

### Offer Form Fields (Create/Edit)

| Section        | Fields                                                                |
| -------------- | --------------------------------------------------------------------- |
| Identity       | Title\*, Slug (auto+editable), Internal Note                          |
| Visuals        | Image upload, Badge Text, CTA Text                                    |
| Terms & SEO    | T&C textarea, Meta Title, Meta Description, Description               |
| Offer Type     | Dropdown (Buy X Get Y / % / Fixed / Combo / Cart Min / Free Shipping) |
| _Buy X Get Y_  | Buy Qty, Get Qty, Free Product picker (empty = same product)          |
| _Percentage_   | Discount %, Max Cap (₹, optional)                                     |
| _Fixed_        | Discount Amount (₹)                                                   |
| _Combo_        | Product multi-picker, Combo Price (₹)                                 |
| _Cart Minimum_ | Min Value (₹), Discount Type (% or flat), Discount Value              |
| Scope          | Products multi-picker, Categories multi-picker (empty = cart-wide)    |
| Lifecycle      | Is Active toggle, Start Date, End Date                                |
| Priority       | Priority number (tiebreaker)                                          |
| Display        | Show on Products Page, Show on Homepage                               |
| Limits         | Max Total Uses, Max Per User                                          |

### Coupon Form Fields (Create/Edit)

| Section  | Fields                                                            |
| -------- | ----------------------------------------------------------------- |
| Code     | Code (auto-uppercase)\*, Description                              |
| Discount | Type (% or Fixed), Value, Max Cap (for %)                         |
| Scope    | Products multi-picker, Categories multi-picker, Excluded Products |
| Minimum  | Min Purchase Amount (on eligible items)                           |
| Limits   | Total Usage Limit, Per-User Limit                                 |
| Validity | Valid From*, Valid To*                                            |
| Status   | Is Active toggle                                                  |

### Media Form Fields (Create/Edit)

| Field                 | Notes                                           |
| --------------------- | ----------------------------------------------- |
| Media Type            | Video / GIF / Image / YouTube / Instagram embed |
| File / Embed URL      | Upload for hosted; URL for embeds               |
| Thumbnail             | Poster image for video                          |
| Title, Caption        | Display text                                    |
| CTA Text, CTA URL     | Optional button                                 |
| Autoplay, Loop, Muted | Toggles                                         |
| Order, Is Active      | Ordering + visibility                           |

---

## 11. Products Page — Offers Tab

**File**: src/app/products/page.tsx [MODIFY]

- Offers virtual tab appended after real category tabs
- ?category=offers → GET /api/offers/products
- Product cards get <OfferBadge /> (e.g. Buy 2 Get 1, 10% OFF)

**New API**: GET /api/offers/products

- Fetches active offers → union of applicableProducts + products in applicableCategories
- Returns deduplicated list with offers: [{ title, badgeText }] per product

---

## 12. Offer Detail Pages — /offers/[slug]

**File**: src/app/offers/[slug]/page.tsx [NEW]

Structure:
`Offer hero (banner + title + badge)
Description + Terms (collapsible)
Eligible Products Grid (Add to Cart)
Countdown timer (if endDate set)
CTA → /products?category=offers`

SEO: generateMetadata with OG tags, robots: index when active / noindex when expired.
Performance: ISR revalidate: 60.

---

## 13. Homepage Video/GIF Section

Placement in src/app/page.tsx: after hero slider, before category banners.

**Component**: src/components/VideoGifSection.tsx

- Fetches GET /api/media (active, sorted by order)
- 1 item → full-width; 2–4 → grid/carousel; 5+ → carousel
- Videos play only when in viewport (IntersectionObserver)
- No active media → renders nothing

Upload: new type=media support in upload controller (50MB limit for video, video/mp4/video/webm/image/gif added).

---

## 14. Auth UX — Inline OTP Modal

**File**: src/app/checkout/page.tsx [MODIFY]

- Replace hard redirect with showAuthModal state
- <AuthModal onSuccess={() => { fetchCart(); fetchAddresses(); setShowAuthModal(false); }}>

**File**: src/components/AuthModal.tsx [NEW]

- Inline OTP flow; on success merges guest cart then calls onSuccess()

**File**: src/app/cart/page.tsx [MODIFY]

- handleProceedToCheckout → always navigate to /checkout

---

## 15. Complete File Change Table

### Backend — New

| File                                              | Purpose                                 |
| ------------------------------------------------- | --------------------------------------- |
| server/src/models/Offer.ts                        | Offer schema                            |
| server/src/models/HomepageMedia.ts                | Media schema                            |
| server/src/services/offerEngine.ts                | Auto offer detection + winner selection |
| server/src/services/couponEngine.ts               | Coupon validation + mutual exclusion    |
| server/src/controllers/offer.controller.ts        | Public offer API                        |
| server/src/controllers/admin-offer.controller.ts  | Admin offer CRUD                        |
| server/src/controllers/admin-coupon.controller.ts | Admin coupon CRUD                       |
| server/src/controllers/public-media.controller.ts | Public media API                        |
| server/src/controllers/admin-media.controller.ts  | Admin media CRUD                        |

### Backend — Modified

| File                                            | Change                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| server/src/models/Cart.ts                       | Add appliedOffers, offerDiscount, appliedCoupon, couponDiscount            |
| server/src/models/Coupon.ts                     | Add cannotCombineWithOffers field                                          |
| server/src/models/Order.ts                      | Add appliedOffers, appliedCoupon, offerDiscount, couponDiscount, netAmount |
| server/src/controllers/cart.controller.ts       | getCart runs offerEngine; add apply-coupon / remove-coupon handlers        |
| server/src/controllers/user-order.controller.ts | Full server-side rewrite (price, weight, boxes, shipping, offers, coupons) |
| server/src/controllers/upload.controller.ts     | Video/GIF support, offer + media folders, 50MB limit                       |
| server/src/routes/admin.routes.ts               | Add offer, coupon, media routes                                            |
| server/src/routes/api.routes.ts                 | Add public offer, media, cart-coupon routes                                |

### Frontend — New

| File                                     | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| src/app/offers/[slug]/page.tsx           | Offer detail (SSR + ISR + SEO) |
| src/app/offers/page.tsx                  | Offers listing                 |
| src/app/admin/offers/page.tsx            | Admin offer list               |
| src/app/admin/offers/create/page.tsx     | Admin create offer             |
| src/app/admin/offers/[id]/edit/page.tsx  | Admin edit offer               |
| src/app/admin/coupons/page.tsx           | Admin coupon list              |
| src/app/admin/coupons/create/page.tsx    | Admin create coupon            |
| src/app/admin/coupons/[id]/edit/page.tsx | Admin edit coupon              |
| src/app/admin/media/page.tsx             | Admin media list               |
| src/app/admin/media/create/page.tsx      | Admin create media             |
| src/app/admin/media/[id]/edit/page.tsx   | Admin edit media               |
| src/components/VideoGifSection.tsx       | Homepage video/GIF section     |
| src/components/AuthModal.tsx             | Inline OTP auth modal          |
| src/components/OfferBadge.tsx            | Offer badge for product cards  |

### Frontend — Modified

| File                      | Change                                                 |
| ------------------------- | ------------------------------------------------------ |
| src/app/page.tsx          | Insert VideoGifSection after hero slider               |
| src/app/products/page.tsx | Offers virtual tab, handle ?category=offers            |
| src/app/cart/page.tsx     | Show offers/freeItems/coupon UI; remove login redirect |
| src/app/checkout/page.tsx | Replace redirect with AuthModal                        |
| src/app/admin/layout.tsx  | Add Offers, Coupons, Media to sidebar                  |
| src/lib/guest-cart.ts     | Add createdAt + 7-day expiry                           |
| src/lib/api.ts            | Add offer, coupon, media API functions                 |

---

## 16. Security

| Risk                         | Mitigation                                               |
| ---------------------------- | -------------------------------------------------------- |
| Price manipulation           | All prices from DB in createOrder                        |
| Discount manipulation        | offerEngine + couponEngine re-run server-side            |
| Coupon + offer stacking      | Blocked server-side if offerDiscount > 0                 |
| Razorpay amount manipulation | Uses order.netAmount from DB (existing)                  |
| Offer usage spoofing         | usageCount incremented atomically at order creation only |
| Admin access                 | /api/admin/\* requires requireAuth + requireAdmin        |
| Shipping manipulation        | frontendShippingCost in request body IGNORED             |

---

## 17. Edge Cases

| Case                            | Handling                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| Offer expires during checkout   | Re-validated at order creation; warning; full price charged       |
| Coupon expires during checkout  | Order rejected with coupon expired message                        |
| Offer auto-applied after coupon | Next GET /api/cart clears coupon, applies offer, adds warning     |
| Free product OOS (Q3)           | Order proceeds; isOutOfStock: true on free item; warning returned |
| Multiple eligible offers        | Single best (highest discount) wins; others ignored               |
| Combo offer: one item removed   | Condition no longer met; offer drops on next cart eval            |
| Zero netAmount                  | min(netAmount, 1) to satisfy Razorpay minimum                     |
| Payment fails after offer order | Order stays pending; same netAmount on retry                      |

---

## 18. Implementation Phases

| Phase | Days  | Deliverables                                                                          |
| ----- | ----- | ------------------------------------------------------------------------------------- |
| 1     | 1–2   | Offer model, HomepageMedia model, Cart/Order/Coupon modifications, upload extension   |
| 2     | 2–3   | offerEngine.ts (all rule types, winner selection, free items)                         |
| 3     | 3–4   | couponEngine.ts (validation, mutual exclusion, scoped discount)                       |
| 4     | 4–5   | Rewrite createOrder (price, weight, boxes, shipping, offers, coupons all server-side) |
| 5     | 5–6   | Modify getCart (offerEngine integration); apply-coupon / remove-coupon endpoints      |
| 6     | 6–8   | Admin offer + coupon pages (list + form) + backend CRUD                               |
| 7     | 8–9   | Admin media pages + backend CRUD                                                      |
| 8     | 9–10  | Public offer pages /offers/[slug], /offers, SEO, sitemap                              |
| 9     | 10    | Products page Offers tab + /api/offers/products endpoint                              |
| 10    | 10–11 | VideoGifSection component + /api/media endpoint                                       |
| 11    | 11–12 | Cart/checkout UI (offer display, coupon input, AuthModal)                             |
| 12    | 12–14 | Testing + deploy (unit, integration, E2E, security, responsive)                       |

---

## 19. Acceptance Criteria

### Offers — Admin

- [ ] Admin creates offers of any rule type (Buy X Get Y / % / Fixed / Combo / Cart Min / Free Shipping)
- [ ] Slug auto-generated from title; admin can override
- [ ] Scheduling (start/end dates) enforced in real-time
- [ ] Admin can activate/deactivate, edit, delete
- [ ] Priority field controls tiebreaking

### Offers — Customer

- [ ] Cart **automatically** shows best applicable offer — no customer action required
- [ ] Only one offer applied; highest discount wins
- [ ] Free items appear at ₹0 with attribution
- [ ] Free item OOS: warning shown, order still proceeds
- [ ] Offer auto-removed if eligibility criteria no longer met

### Coupons

- [ ] ABCDEF applies 10% off products X, Y; GHIJKL applies 50% off products Z, A, B
- [ ] Coupon applies to eligible items only (not full cart)
- [ ] Coupon rejected when active offer is present (cannot combine)
- [ ] When offer auto-applies, coupon is cleared with warning
- [ ] Expired/limit-exceeded coupons rejected with clear messages

### Products Page

- [ ] Offers tab shows only products with active offers
- [ ] Product cards show offer badge

### Offer Pages

- [ ] /offers/:slug with OG metadata for social sharing
- [ ] Expired offer URL: graceful offer ended page (not 500)

### Homepage Video/GIF

- [ ] Section below hero slider
- [ ] Admin manages items without code changes
- [ ] No active media = section hidden

### Checkout & Auth

- [ ] Guest adds to cart without login
- [ ] Inline OTP modal at checkout (not redirect)
- [ ] Guest cart merges after login; checkout continues
- [ ] Guest cart expires after 7 days

### Server-Side (Q6)

- [ ] ALL pricing, weight, boxes, shipping, offers, coupons computed server-side
- [ ] Frontend shippingCost ignored
- [ ] Frontend discount values ignored
- [ ] Razorpay amount = server netAmount exactly
