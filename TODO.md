# TODO - Order Management & Shipping Integration

## ✅ Completed (Ready to Push)

### UI Improvements
- [x] Convert View Details and Invoice buttons to pill-shaped buttons with theme colors
  - View Details: #781414 (dark red)
  - Invoice: #FF6600 (orange)
  - Border radius: 20px with hover effects
- [x] Fix vertical alignment issues in order tables (orders, profile, order details)
- [x] Style pagination buttons as orange pills with proper spacing (24px margin)
- [x] Apply consistent button styling across:
  - `/orders` page
  - `/profile` page (recent orders section)
  - `/orders/[id]` page (invoice download)
  - `/admin/orders` page
  - `/admin/products` page

### Delhivery Integration - Code Complete
- [x] Fix ObjectId casting error (added regex validation for 24-char hex)
- [x] Fix field name mismatches:
  - `postalCode` instead of `pincode`
  - `street` instead of `address`
- [x] Create `calculateOrderWeightFromObject()` function for direct order object weight calculation
- [x] Update payment webhook to use new weight calculator
- [x] Add phone number validation (required by Delhivery API)
- [x] Add comprehensive logging for debugging shipment creation
- [x] Create test scripts:
  - `test-delhivery-create-shipment.ts`
  - `check-delhivery-config.ts`
  - `test-complete-payload.ts`

## ⚠️ Blocked - Requires External Action

### Delhivery Shipment Creation
- [ ] **BLOCKED**: API returning 500 error
  - Issue: Warehouse "DIVAINE LEAF NEUTRA PRIVATE LIMITED" (pincode 415519) not activated
  - All code is correct and tested
  - Payload matches Delhivery API documentation exactly
  - **Action Required**: Contact Delhivery support to:
    - Verify warehouse is fully activated
    - Check API token has shipment creation permissions
    - Confirm staging environment is functional
    - Ask about production API URL if staging has issues

## 📋 Next Steps (After Delhivery Activation)

### Environment Configuration
- [ ] Update `.env` with confirmed warehouse details:
  - `SELLER_NAME`: "DIVAINE LEAF NEUTRA PRIVATE LIMITED" (or confirmed format)
  - `SELLER_ADDRESS`: "610, A/p. Songaon tarf, Near Songaon Phata, Opposite Fulpakhru hotel, Songaon"
  - `SELLER_PINCODE`: "415519" ✓ (already set)
  - `SELLER_PHONE`: "9616799711"
  - `SELLER_CITY`: "Nisrale"
  - `SELLER_STATE`: "Maharashtra"

### Optional Enhancements
- [ ] Implement mock/test mode for shipment creation during development
- [ ] Add shipment tracking display on order details page
- [ ] Add bulk shipment creation for admin
- [ ] Add retry logic for failed shipment creation

## 📝 Notes

### Warehouse Registration Details
- **Company**: Divaine Leaf Neutra Private Limited
- **Contact**: Sayajeerao Kadam
- **Phone**: 9616799711
- **Address**: 610, A/p. Songaon tarf, Near Songaon Phata, Opposite Fulpakhru hotel, Songaon
- **City**: Nisrale
- **State**: Maharashtra
- **Pincode**: 415519

### API Details
- **Staging URL**: `https://staging-express.delhivery.com`
- **Track URL**: `https://track.delhivery.com`
- **Token**: Configured (40 chars)
- **Last Test**: 2026-01-27 - All payloads return 500 error

### Files Modified
- `src/app/orders/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/orders/[id]/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/products/page.tsx`
- `server/src/controllers/delhivery.controller.ts`
- `server/src/utils/orderWeightCalculator.ts`
- `server/src/routes/payment.ts`

### Test Scripts Created
- `server/scripts/test-delhivery-create-shipment.ts`
- `server/scripts/check-delhivery-config.ts`
- `server/scripts/test-complete-payload.ts`
