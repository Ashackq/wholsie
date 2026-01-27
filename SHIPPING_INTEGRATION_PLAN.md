# Delhivery Shipping Integration - Implementation Plan

## 📋 Current State Analysis

### ✅ Already Implemented

1. **Delhivery Utils** (`server/src/utils/delhivery.ts`)
   - ✅ Pincode serviceability check
   - ✅ TAT (Turnaround Time) calculation
   - ✅ Shipping charges calculation
   - ✅ Shipment creation
   - ✅ Shipment cancellation
   - ✅ Shipment tracking
   - ✅ Pickup location management

2. **Controllers** (`server/src/controllers/delhivery.controller.ts`)
   - ✅ Create shipment endpoint
   - ✅ Cancel shipment endpoint
   - ✅ Check pincode endpoint
   - ✅ Get TAT endpoint
   - ✅ Get shipping charges endpoint
   - ✅ Get tracking endpoint

3. **Admin UI** (`src/app/admin/orders/page.tsx`)
   - ✅ Create shipment button
   - ✅ Cancel shipment button
   - ✅ Track shipment link
   - ✅ Manual shipment creation per order

4. **Models**
   - ✅ Order has `delhiveryTrackingId` field
   - ✅ Product has `weight` field (in grams)

### ❌ Missing / Needs Implementation

1. **Box Categorization System** - NOT IMPLEMENTED
   - No box definitions
   - No weight-to-box mapping logic
   - No overhead calculations

2. **Automatic Shipping Cost Calculation** - PARTIALLY IMPLEMENTED
   - ✅ API exists but NOT integrated into checkout flow
   - ❌ Free shipping logic (>₹500) not implemented
   - ❌ Cart-level shipping cost calculation missing

3. **Address Validation Flow** - NOT INTEGRATED
   - ✅ API exists but NOT called when user adds address
   - ❌ No TAT display on address selection
   - ❌ No serviceability check during checkout

4. **Automatic Shipment Creation** - NOT IMPLEMENTED
   - ❌ No automatic shipment on payment completion
   - ❌ Only manual creation from admin panel

5. **Weight Calculation** - NOT IMPLEMENTED
   - ❌ No order-level weight calculation from products
   - ❌ No box selection logic
   - ❌ Hardcoded weight "500g" in current implementation

6. **Shipment ID Tracking** - PARTIAL
   - ✅ Tracking ID stored in order
   - ⚠️ No abandoned shipment prevention
   - ❌ No shipment creation state management

---

## 🎯 Implementation Plan

### Phase 1: Box Categorization System

#### 1.1 Create Box Configuration

**File**: `server/src/config/boxes.ts`

```typescript
export interface BoxCategory {
  id: string;
  name: string;
  maxWeightGrams: number;
  dimensionsCm: {
    length: number;
    breadth: number;
    height: number;
  };
  overheadWeightGrams: number;
}

export const BOX_CATEGORIES: BoxCategory[] = [
  {
    id: "box-s",
    name: "Small Box",
    maxWeightGrams: 500,
    dimensionsCm: { length: 20, breadth: 15, height: 10 },
    overheadWeightGrams: 30,
  },
  {
    id: "box-m",
    name: "Medium Box",
    maxWeightGrams: 1000,
    dimensionsCm: { length: 30, breadth: 20, height: 15 },
    overheadWeightGrams: 40,
  },
  {
    id: "box-l",
    name: "Large Box",
    maxWeightGrams: Number.MAX_SAFE_INTEGER,
    dimensionsCm: { length: 40, breadth: 30, height: 20 },
    overheadWeightGrams: 50,
  },
];

export function selectBoxForWeight(
  totalProductWeightGrams: number,
): BoxCategory {
  for (const box of BOX_CATEGORIES) {
    if (totalProductWeightGrams <= box.maxWeightGrams) {
      return box;
    }
  }
  return BOX_CATEGORIES[BOX_CATEGORIES.length - 1]; // Default to largest
}

export function calculateShipmentWeight(productWeightGrams: number): number {
  const box = selectBoxForWeight(productWeightGrams);
  return productWeightGrams + box.overheadWeightGrams;
}
```

#### 1.2 Create Order Weight Calculator

**File**: `server/src/utils/orderWeightCalculator.ts`

```typescript
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import {
  selectBoxForWeight,
  calculateShipmentWeight,
  BoxCategory,
} from "../config/boxes.js";

export interface OrderWeightCalculation {
  totalProductWeight: number; // in grams
  selectedBox: BoxCategory;
  shipmentWeight: number; // product weight + overhead
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
}

export async function calculateOrderWeight(
  orderId: string,
): Promise<OrderWeightCalculation> {
  const order = await Order.findById(orderId).populate({
    path: "items.productId",
    model: "Product",
  });

  if (!order) {
    throw new Error("Order not found");
  }

  let totalProductWeight = 0;

  // Sum all product weights
  for (const item of order.items) {
    const product = item.productId as any;
    const productWeight = product?.weight || 100; // Default 100g if not set
    totalProductWeight += productWeight * (item.quantity || 1);
  }

  // Select appropriate box
  const selectedBox = selectBoxForWeight(totalProductWeight);

  // Calculate shipment weight
  const shipmentWeight = calculateShipmentWeight(totalProductWeight);

  return {
    totalProductWeight,
    selectedBox,
    shipmentWeight,
    dimensions: selectedBox.dimensionsCm,
  };
}
```

---

### Phase 2: Shipping Cost Integration

#### 2.1 Update Order Schema

**File**: `server/src/models/Order.ts`

Add new fields:

```typescript
// Add to orderSchema
shippingCalculation: {
  productWeight: Number,
  boxCategory: String,
  shipmentWeight: Number,
  dimensions: {
    length: Number,
    breadth: Number,
    height: Number
  },
  shippingCostCalculatedAt: Date
},
freeShippingApplied: { type: Boolean, default: false },
```

#### 2.2 Create Shipping Calculator Utility

**File**: `server/src/utils/shippingCalculator.ts`

```typescript
import { calculateOrderWeight } from "./orderWeightCalculator.js";
import { calculateShippingCost } from "./delhivery.js";
import { env } from "../config/env.js";

export interface ShippingCalculationResult {
  shippingCost: number;
  isFreeShipping: boolean;
  weight: number;
  estimatedDeliveryDays?: number;
}

export async function calculateShippingForOrder(
  orderId: string,
  destinationPin: string,
  orderSubtotal: number,
): Promise<ShippingCalculationResult> {
  // Check free shipping threshold
  const FREE_SHIPPING_THRESHOLD = 500;

  if (orderSubtotal >= FREE_SHIPPING_THRESHOLD) {
    return {
      shippingCost: 0,
      isFreeShipping: true,
      weight: 0,
    };
  }

  // Calculate order weight
  const weightCalc = await calculateOrderWeight(orderId);

  // Get shipping cost from Delhivery
  const originPin = env.SELLER_PINCODE || "415519";
  const result = await calculateShippingCost({
    originPin,
    destinationPin,
    weight: weightCalc.shipmentWeight,
    paymentMode: "Prepaid", // No COD as per requirement
  });

  if (!result.success || !result.totalAmount) {
    throw new Error(result.error || "Failed to calculate shipping cost");
  }

  return {
    shippingCost: result.totalAmount,
    isFreeShipping: false,
    weight: weightCalc.shipmentWeight,
  };
}
```

#### 2.3 Create Shipping Controller Endpoint

**File**: `server/src/controllers/shipping.controller.ts` (NEW)

```typescript
import { Request, Response } from "express";
import { calculateShippingForOrder } from "../utils/shippingCalculator.js";
import {
  checkPincodeServiceability,
  getExpectedTat,
} from "../utils/delhivery.js";
import { env } from "../config/env.js";

/**
 * Calculate shipping cost for cart/checkout
 */
export async function calculateCartShipping(req: Request, res: Response) {
  try {
    const { destinationPin, cartTotal, items } = req.body;

    if (!destinationPin || !cartTotal) {
      return res.status(400).json({
        error: "Destination pincode and cart total are required",
      });
    }

    // Check serviceability
    const serviceability = await checkPincodeServiceability(destinationPin);
    if (!serviceability.serviceable) {
      return res.status(400).json({
        error: "Delivery not available for this pincode",
        serviceable: false,
        remark: serviceability.remark,
      });
    }

    // Check free shipping
    const FREE_SHIPPING_THRESHOLD = 500;
    if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
      return res.json({
        success: true,
        shippingCost: 0,
        freeShipping: true,
        serviceable: true,
        message: "Free shipping applied",
      });
    }

    // Calculate weight from cart items (simplified - actual implementation would query products)
    const estimatedWeight = items?.length ? items.length * 100 : 500; // 100g per item estimate

    // Get TAT
    const originPin = env.SELLER_PINCODE || "415519";
    const tatResult = await getExpectedTat({
      originPin,
      destinationPin,
    });

    // Calculate shipping cost
    const costResult = await calculateShippingCost({
      originPin,
      destinationPin,
      weight: estimatedWeight,
      paymentMode: "Prepaid",
    });

    if (!costResult.success) {
      throw new Error(costResult.error || "Failed to calculate shipping");
    }

    return res.json({
      success: true,
      shippingCost: costResult.totalAmount,
      freeShipping: false,
      serviceable: true,
      estimatedDeliveryDays: tatResult.expectedDeliveryDays,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to calculate shipping",
    });
  }
}
```

---

### Phase 3: Address Validation Flow

#### 3.1 Create Address Validation Endpoint

**File**: `server/src/controllers/address.controller.ts`

Add new method:

```typescript
/**
 * Validate address with Delhivery serviceability and TAT
 */
export async function validateAddressForShipping(req: Request, res: Response) {
  try {
    const { pincode } = req.body;

    if (!pincode) {
      return res.status(400).json({ error: "Pincode is required" });
    }

    // Check serviceability
    const serviceability = await checkPincodeServiceability(pincode);

    if (!serviceability.serviceable) {
      return res.json({
        success: true,
        serviceable: false,
        message:
          serviceability.remark || "Delivery not available for this pincode",
      });
    }

    // Get TAT
    const originPin = env.SELLER_PINCODE || "415519";
    const tatResult = await getExpectedTat({
      originPin,
      destinationPin: pincode,
    });

    return res.json({
      success: true,
      serviceable: true,
      estimatedDeliveryDays: tatResult.expectedDeliveryDays,
      deliveryDate: tatResult.estimatedDeliveryDate,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to validate address",
    });
  }
}
```

---

### Phase 4: Automatic Shipment Creation

#### 4.1 Update Payment Webhook

**File**: `server/src/routes/payment.ts`

In the payment success handler, add:

```typescript
// After invoice creation, create shipment automatically
try {
  const weightCalc = await calculateOrderWeight(order._id.toString());

  // Check if destination is serviceable
  const shippingPin = order.shippingAddress?.postalCode;
  if (shippingPin) {
    const serviceability = await checkPincodeServiceability(shippingPin);

    if (serviceability.serviceable) {
      // Create shipment data
      const shipmentData = {
        shipments: [
          {
            // ... shipment details with calculated weight and dimensions
            weight: weightCalc.shipmentWeight.toString(),
            shipment_width: weightCalc.dimensions.breadth.toString(),
            shipment_height: weightCalc.dimensions.height.toString(),
            // ... other fields
          },
        ],
        pickup_location: {
          /* ... */
        },
      };

      const shipmentResult = await createShipment(shipmentData);

      if (shipmentResult.success && shipmentResult.waybill) {
        order.delhiveryTrackingId = shipmentResult.waybill;
        order.delhiveryShipmentCreatedAt = new Date();
        order.status = "processing";
        await order.save();

        console.log(
          `✅ Auto-created shipment ${shipmentResult.waybill} for order ${order.orderId}`,
        );
      }
    }
  }
} catch (shipmentError) {
  console.error("⚠️ Failed to auto-create shipment:", shipmentError);
  // Don't fail the payment - shipment can be created manually
}
```

#### 4.2 Create Shipment Creation Service

**File**: `server/src/services/shipmentService.ts` (NEW)

```typescript
import { Order } from "../models/Order.js";
import { createShipment as delhiveryCreateShipment } from "../utils/delhivery.js";
import { calculateOrderWeight } from "../utils/orderWeightCalculator.js";
import { env } from "../config/env.js";

export interface ShipmentCreationResult {
  success: boolean;
  waybill?: string;
  error?: string;
  orderId: string;
}

export async function createShipmentForOrder(
  orderId: string,
): Promise<ShipmentCreationResult> {
  try {
    // Find order
    const order = await Order.findById(orderId).populate("userId");

    if (!order) {
      return { success: false, error: "Order not found", orderId };
    }

    // Check if shipment already exists
    if (order.delhiveryTrackingId) {
      return {
        success: false,
        error: "Shipment already exists",
        orderId,
        waybill: order.delhiveryTrackingId,
      };
    }

    // Payment must be completed
    if (order.paymentStatus !== "completed") {
      return { success: false, error: "Payment not completed", orderId };
    }

    // Calculate weight and select box
    const weightCalc = await calculateOrderWeight(orderId);

    // Prepare shipment data
    const user = order.userId as any;
    const shippingAddr = order.shippingAddress as any;

    const shipmentData = {
      shipments: [
        {
          name: user?.name || user?.firstName + " " + user?.lastName,
          add: shippingAddr?.street || shippingAddr?.address || "",
          pin: shippingAddr?.postalCode || shippingAddr?.pincode || "",
          city: shippingAddr?.city || "",
          state: shippingAddr?.state || "",
          country: "India",
          phone: user?.phone || "",
          order: order.orderId || order.orderNo || order._id.toString(),
          payment_mode: "Prepaid" as const,
          order_date:
            order.createdAt?.toISOString() || new Date().toISOString(),
          total_amount: (order.total || order.netAmount || 0).toString(),
          products_desc: `${order.items?.length || 1} item(s)`,
          quantity: order.items
            ?.reduce((sum, item) => sum + (item.quantity || 1), 0)
            .toString(),
          weight: weightCalc.shipmentWeight.toString(),
          shipment_width: weightCalc.dimensions.breadth.toString(),
          shipment_height: weightCalc.dimensions.height.toString(),
          seller_add: env.SELLER_ADDRESS || "Warehouse",
          seller_name: env.SELLER_NAME || "Wholesiii",
        },
      ],
      pickup_location: {
        name: env.SELLER_NAME || "Wholesiii",
        pin: env.SELLER_PINCODE || "",
      },
    };

    // Create shipment
    const result = await delhiveryCreateShipment(shipmentData);

    if (!result.success || !result.waybill) {
      return {
        success: false,
        error: result.rmk || result.error || "Shipment creation failed",
        orderId,
      };
    }

    // Update order
    order.delhiveryTrackingId = result.waybill;
    order.delhiveryShipmentCreatedAt = new Date();
    order.status = "processing";

    // Store weight calculation
    (order as any).shippingCalculation = {
      productWeight: weightCalc.totalProductWeight,
      boxCategory: weightCalc.selectedBox.id,
      shipmentWeight: weightCalc.shipmentWeight,
      dimensions: weightCalc.dimensions,
      shippingCostCalculatedAt: new Date(),
    };

    await order.save();

    return {
      success: true,
      waybill: result.waybill,
      orderId,
    };
  } catch (error: any) {
    console.error("Shipment creation error:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
      orderId,
    };
  }
}

// Prevent abandoned shipments by checking for orders without tracking
export async function findOrdersNeedingShipment() {
  return Order.find({
    paymentStatus: "completed",
    delhiveryTrackingId: { $exists: false },
    status: { $in: ["confirmed", "pending"] },
  }).limit(50);
}
```

---

### Phase 5: Frontend Integration

#### 5.1 Update Checkout Page

**File**: `src/app/checkout/page.tsx`

Add shipping calculation when address is selected:

```typescript
const [shippingCost, setShippingCost] = useState(0);
const [shippingInfo, setShippingInfo] = useState<any>(null);

const calculateShipping = async (pincode: string, cartTotal: number) => {
  try {
    const response = await fetch("/api/shipping/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationPin: pincode,
        cartTotal,
        items: cart.items,
      }),
    });

    const data = await response.json();

    if (data.success) {
      setShippingCost(data.shippingCost || 0);
      setShippingInfo(data);
    }
  } catch (error) {
    console.error("Failed to calculate shipping:", error);
  }
};

// Call when address is selected or changed
useEffect(() => {
  if (selectedAddress?.pincode && cartTotal) {
    calculateShipping(selectedAddress.pincode, cartTotal);
  }
}, [selectedAddress, cartTotal]);
```

#### 5.2 Update Address Selection

**File**: `src/app/checkout/page.tsx` or Address component

Add validation when address is added:

```typescript
const validateAddress = async (pincode: string) => {
  const response = await fetch("/api/addresses/validate-shipping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pincode }),
  });

  const data = await response.json();

  if (!data.serviceable) {
    alert(`Delivery not available for pincode ${pincode}`);
    return false;
  }

  if (data.estimatedDeliveryDays) {
    // Show delivery estimate
    console.log(`Estimated delivery: ${data.estimatedDeliveryDays} days`);
  }

  return true;
};
```

---

## 📊 Summary of Changes

### New Files to Create:

1. ✅ `server/src/config/boxes.ts` - Box categorization
2. ✅ `server/src/utils/orderWeightCalculator.ts` - Weight calculation
3. ✅ `server/src/utils/shippingCalculator.ts` - Shipping cost logic
4. ✅ `server/src/services/shipmentService.ts` - Shipment creation service
5. ✅ `server/src/controllers/shipping.controller.ts` - Shipping endpoints

### Files to Modify:

1. ✅ `server/src/models/Order.ts` - Add weight/shipping fields
2. ✅ `server/src/routes/payment.ts` - Auto-create shipment
3. ✅ `server/src/controllers/address.controller.ts` - Add validation
4. ✅ `server/src/controllers/delhivery.controller.ts` - Use new weight calculator
5. ✅ `src/app/checkout/page.tsx` - Add shipping calculation
6. ✅ Add routing for new endpoints

### Environment Variables Needed:

```env
SELLER_PINCODE=415519
SELLER_ADDRESS=Your warehouse address
SELLER_NAME=Wholesiii
DELHIVERY_TOKEN=your_token_here
```

---

## 🔍 Critical Points to Address

### 1. Abandoned Shipment Prevention

- Store shipment creation attempts in database
- Implement retry mechanism
- Create background job to check orders without tracking IDs
- Add shipment creation status field to Order model

### 2. Weight Accuracy

- Ensure all products have weight field populated
- Add validation when creating/editing products
- Provide default weight fallback (100g)

### 3. Free Shipping Logic

- Threshold: ₹500
- Apply before Delhivery calculation
- Display clearly in UI
- Include in order total calculation

### 4. Error Handling

- Graceful failure on shipment auto-creation
- Allow manual retry from admin panel
- Log all shipment creation attempts
- Alert admin for failed shipments

---

## 🚀 Implementation Sequence

1. **Phase 1** - Box system (1-2 hours)
2. **Phase 2** - Shipping cost integration (2-3 hours)
3. **Phase 3** - Address validation (1-2 hours)
4. **Phase 4** - Auto shipment creation (2-3 hours)
5. **Phase 5** - Frontend integration (2-3 hours)
6. **Testing** - End-to-end testing (2-3 hours)

**Total Estimated Time: 10-16 hours**

---

## ✅ Next Steps

Please review this plan and let me know:

1. Are the box categories (S/M/L) and weights correct?
2. Is ₹500 the correct free shipping threshold?
3. Should shipment be created automatically on payment or manually from admin?
4. Any additional validations or checks needed?

Once approved, I'll proceed with implementation step-by-step.
