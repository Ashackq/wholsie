// Delhivery integration for shipment tracking and management
// https://www.delhivery.com/
// API Docs: https://developers.delhivery.com/docs

import { env } from "../config/env.js";

const DELHIVERY_API_BASE =
  env.DELHIVERY_API_URL || "https://staging-express.delhivery.com";
const DELHIVERY_TRACK_BASE =
  env.DELHIVERY_TRACK_API_URL || "https://track.delhivery.com";

interface DelhiveryShipmentData {
  shipments: Array<{
    name: string;
    add: string;
    pin: string;
    city: string;
    state: string;
    country: string;
    phone: string;
    order: string;
    payment_mode: "Prepaid" | "COD";
    return_pin?: string;
    return_city?: string;
    return_phone?: string;
    return_add?: string;
    return_state?: string;
    return_country?: string;
    products_desc?: string;
    hsn_code?: string;
    cod_amount?: string;
    order_date?: string;
    total_amount?: string;
    seller_add?: string;
    seller_name?: string;
    seller_inv?: string;
    quantity?: string;
    waybill?: string;
    shipment_width?: string;
    shipment_height?: string;
    weight?: string;
    seller_gst_tin?: string;
    shipping_mode?: string;
    address_type?: string;
  }>;
  pickup_location: {
    name?: string;
    pin?: string;
  };
  pickup_time?: string; // HHMM-HHMM
}

interface PincodeServiceability {
  delivery_codes: Array<{
    postal_code: {
      pin: string;
      city: string;
      state: string;
      state_code: string;
      country: string;
      sort_code: string;
    };
    is_cod: boolean;
    is_prepaid: boolean;
    is_surface: boolean;
    is_pickup: boolean;
    is_reverse: boolean;
    remark?: string; // "Embargo" indicates temporary NSZ, blank means serviceable
  }>;
}

interface TrackingData {
  ShipmentData: Array<{
    Shipment: {
      Status: {
        Status: string;
        StatusType: string;
        StatusDateTime: string;
        StatusLocation: string;
        Instructions: string;
      };
      AWB: string;
      OrderNo: string;
      Consignee: {
        Name: string;
        Address: string;
        City: string;
        State: string;
        Pincode: string;
      };
      Destination: string;
      Origin: string;
      ReferenceNo: string;
      ScanDetail: {
        Scan: Array<{
          ScanDateTime: string;
          ScanType: string;
          Scan: string;
          StatusCode: string;
          ScannedLocation: string;
        }>;
      };
    };
  }>;
}

interface ExpectedTatResponse {
  expectedTat?: number;
  expected_delivery_date?: string;
  remarks?: string;
  [key: string]: any;
}

interface ShippingChargeResponse {
  total_amount?: number;
  delivery_charges?: number;
  cod_charges?: number;
  weight?: number;
  [key: string]: any;
}

/**
 * Check if Delhivery delivers to a specific pincode
 * As per Delhivery docs: https://one.delhivery.com/developer-portal/document/b2c/detail/pincode-serviceability
 * - Empty delivery_codes array means pincode is non-serviceable (NSZ)
 * - remark "Embargo" indicates temporary NSZ
 * - Blank remark means pincode is serviceable
 */
export async function checkPincodeServiceability(pincode: string): Promise<{
  serviceable: boolean;
  isCOD: boolean;
  isPrepaid: boolean;
  city?: string;
  state?: string;
  remark?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_TRACK_BASE}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as PincodeServiceability;

    // Empty list means pincode is non-serviceable (NSZ)
    if (!data.delivery_codes || data.delivery_codes.length === 0) {
      return {
        serviceable: false,
        isCOD: false,
        isPrepaid: false,
      };
    }

    const pincodeData = data.delivery_codes[0];

    // Check if pincode is under embargo (temporary NSZ)
    const isEmbargo = pincodeData.remark?.toLowerCase().includes("embargo");
    const serviceable = !isEmbargo;

    return {
      serviceable,
      isCOD: serviceable ? pincodeData.is_cod || false : false,
      isPrepaid: serviceable ? pincodeData.is_prepaid || false : false,
      city: pincodeData.postal_code?.city,
      state: pincodeData.postal_code?.state,
      remark: pincodeData.remark,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery pincode check error:", err);
    throw err;
  }
}

function ensureToken() {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }
  return token;
}

/**
 * Get expected TAT (turnaround time) between two pincodes
 */
export async function getExpectedTat(params: {
  originPin: string;
  destinationPin: string;
  mot?: string; // mode of transport, default Surface "S"
  pdt?: string; // product type, default "B2C"
  expectedPickupDate?: string; // format "YYYY-MM-DD HH:mm"
}): Promise<ExpectedTatResponse> {
  const token = ensureToken();

  const {
    originPin,
    destinationPin,
    mot = "S",
    pdt = "B2C",
    expectedPickupDate,
  } = params;

  const pickup =
    expectedPickupDate || `${new Date().toISOString().slice(0, 10)} 06:30`;

  const url = `${DELHIVERY_TRACK_BASE}/api/dc/expected_tat?origin_pin=${encodeURIComponent(originPin)}&destination_pin=${encodeURIComponent(destinationPin)}&mot=${encodeURIComponent(mot)}&pdt=${encodeURIComponent(pdt)}&expected_pickup_date=${encodeURIComponent(pickup)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Delhivery expected TAT error: ${response.status} - ${text}`,
    );
  }

  return (await response.json()) as ExpectedTatResponse;
}

/**
 * Get shipping charges quote from Delhivery
 */
export async function getShippingCharges(params: {
  originPin: string;
  destinationPin: string;
  weight: number; // grams
  paymentMode: "Pre-paid" | "COD";
  codAmount?: number;
}): Promise<ShippingChargeResponse> {
  const token = ensureToken();

  const { originPin, destinationPin, weight, paymentMode, codAmount } = params;
  const url = `${DELHIVERY_TRACK_BASE}/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=${encodeURIComponent(destinationPin)}&o_pin=${encodeURIComponent(originPin)}&cgm=${encodeURIComponent(weight.toString())}&pt=${encodeURIComponent(paymentMode)}${codAmount ? `&cod=${encodeURIComponent(codAmount.toString())}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Delhivery shipping charge error: ${response.status} - ${text}`,
    );
  }

  return (await response.json()) as ShippingChargeResponse;
}

/**
 * Create a new shipment with Delhivery
 */
export async function createShipment(
  shipmentData: DelhiveryShipmentData,
): Promise<{
  success: boolean;
  waybill?: string;
  packages?: string;
  error?: string;
  rmk?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    // Use TRACK URL for shipment creation (production endpoint that works)
    const url = `${DELHIVERY_TRACK_BASE}/api/cmu/create.json`;

    const formData = new URLSearchParams();
    formData.append("format", "json");
    formData.append("data", JSON.stringify(shipmentData));

    console.log("Calling Delhivery API:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log("Delhivery Response Status:", response.status);
    console.log("Delhivery Response Body:", responseText);

    if (!response.ok) {
      throw new Error(
        `Delhivery API error: ${response.status} - ${responseText}`,
      );
    }

    const data = JSON.parse(responseText);
    console.log("Parsed Delhivery Response:", JSON.stringify(data, null, 2));

    // Extract waybill from packages array if not at top level
    const waybill =
      data.waybill || (data.packages && data.packages[0]?.waybill);

    return {
      success: data.success || false,
      waybill: waybill,
      packages: data.packages,
      error: data.error,
      rmk: data.rmk,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery create shipment error:", err);
    throw err;
  }
}

/**
 * Track a shipment using waybill/AWB number(s)
 * @param waybills - Single waybill string or array of waybills (up to 50)
 */
export async function getTrackingStatus(
  waybills: string | string[],
): Promise<TrackingData | null> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    // Handle both single waybill and array of waybills
    const waybillParam = Array.isArray(waybills) ? waybills.join(',') : waybills;
    const url = `${DELHIVERY_TRACK_BASE}/api/v1/packages/json/?waybill=${encodeURIComponent(waybillParam)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as TrackingData;
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery tracking error:", err);
    throw err;
  }
}

/**
 * Cancel a shipment
 */
export async function cancelShipment(waybill: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/api/p/edit`;

    const formData = new URLSearchParams();
    formData.append("waybill", waybill);
    formData.append("cancellation", "true");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.rmk || "Shipment cancelled successfully",
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery cancel shipment error:", err);
    throw err;
  }
}

/**
 * Get warehouse/pickup locations
 */
export async function getPickupLocations(): Promise<
  Array<{
    name: string;
    pin: string;
    add: string;
    city: string;
    state: string;
  }>
> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/api/backend/clientwarehouse/v1/warehouse/`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery pickup locations error:", err);
    return [];
  }
}

/**
 * Fetch multiple waybills in bulk (up to 10,000)
 * These waybills are pre-generated and can be stored for later use in shipment creation.
 * Note: Waybills are generated in batches of 25 at backend. Using them immediately after
 * fetching may occasionally result in errors - recommend storing and using later.
 *
 * Rate Limits:
 * - Max 10,000 waybills per request
 * - Max 50,000 waybills in a 5-minute window (exceeding will throttle IP for 1 minute)
 * - Max 5 requests per 5 minutes per IP
 *
 * @param count Number of waybills to fetch (1-10000)
 */
export async function fetchWaybills(count: number = 10): Promise<{
  success: boolean;
  waybills?: string[];
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  // Validate count
  if (count < 1 || count > 10000) {
    return {
      success: false,
      error: "Count must be between 1 and 10,000",
    };
  }

  try {
    // Use production URL (track.delhivery.com) for waybill fetching
    const url = `${DELHIVERY_TRACK_BASE}/waybill/api/bulk/json/?token=${encodeURIComponent(token)}&count=${count}`;
    console.log(`Fetching ${count} waybills from Delhivery...`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched waybills:`, data);

    // Response can be:
    // - Array of waybills: ["12345", "67890"]
    // - Comma-separated string: "12345,67890,11111"
    // - Single waybill string: "12345"
    let waybills: string[];
    if (Array.isArray(data)) {
      waybills = data;
    } else if (typeof data === "string" && data.includes(",")) {
      waybills = data.split(",").map((w: string) => w.trim());
    } else {
      waybills = [data];
    }

    return {
      success: true,
      waybills: waybills,
    };
  } catch (err) {
    console.error("Delhivery fetch waybills error:", err);
    throw err;
  }
}

/**
 * Fetch a single waybill
 * Faster than bulk API for single waybill needs.
 *
 * Rate Limits:
 * - Max 750 requests per 5 minutes per IP
 */
export async function fetchSingleWaybill(): Promise<{
  success: boolean;
  waybill?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    // Use production URL for waybill fetching
    const url = `${DELHIVERY_TRACK_BASE}/waybill/api/fetch/json/?token=${encodeURIComponent(token)}`;
    console.log("Fetching single waybill from Delhivery...");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Successfully fetched single waybill:", data);

    return {
      success: true,
      waybill: typeof data === "string" ? data : data.waybill,
    };
  } catch (err) {
    console.error("Delhivery fetch single waybill error:", err);
    throw err;
  }
}

/**
 * Get estimated TAT (Turn Around Time) between origin and destination
 */
export async function getEstimatedTAT(
  originPin: string,
  destinationPin: string,
): Promise<{
  success: boolean;
  tat?: number; // in days
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=${destinationPin}&o_pin=${originPin}&cgm=500&pt=Pre-paid`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // Delhivery returns TAT in days
    return {
      success: true,
      tat: data[0]?.estimated_delivery_days || null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery TAT error:", err);
    throw err;
  }
}

interface WarehouseData {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country?: string;
  return_address?: string;
  return_city?: string;
  return_state?: string;
  return_pin?: string;
  return_country?: string;
}

/**
 * Create a new warehouse/pickup location
 */
export async function createWarehouse(warehouse: WarehouseData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/api/backend/clientwarehouse/v1/create/`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...warehouse,
        country: warehouse.country || "India",
        return_address: warehouse.return_address || warehouse.address,
        return_city: warehouse.return_city || warehouse.city,
        return_state: warehouse.return_state || warehouse.state,
        return_pin: warehouse.return_pin || warehouse.pin,
        return_country:
          warehouse.return_country || warehouse.country || "India",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Warehouse created successfully",
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery create warehouse error:", err);
    throw err;
  }
}

/**
 * Update an existing warehouse/pickup location
 */
export async function updateWarehouse(
  name: string,
  updates: Partial<WarehouseData>,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/api/backend/clientwarehouse/v1/update/`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        ...updates,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || "Warehouse updated successfully",
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery update warehouse error:", err);
    throw err;
  }
}

/**
 * Calculate shipping cost
 */
export async function calculateShippingCost(params: {
  originPin: string;
  destinationPin: string;
  weight: number; // in grams
  paymentMode: "Prepaid" | "COD";
  codAmount?: number;
}): Promise<{
  success: boolean;
  totalAmount?: number;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const { originPin, destinationPin, weight, paymentMode, codAmount } =
      params;
    const paymentType = paymentMode === "Prepaid" ? "Pre-paid" : "COD";

    const url = `${DELHIVERY_TRACK_BASE}/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=${destinationPin}&o_pin=${originPin}&cgm=${weight}&pt=${paymentType}${codAmount ? `&cod=${codAmount}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      totalAmount: data[0]?.total_amount || 0,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery shipping cost error:", err);
    throw err;
  }
}

/**
 * Update shipment details after creation
 */
export async function updateShipment(
  waybill: string,
  updates: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pin?: string;
    quantity?: string;
    weight?: string;
  },
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/api/p/edit`;
    const formData = new URLSearchParams();
    formData.append("waybill", waybill);

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.rmk || "Shipment updated successfully",
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery update shipment error:", err);
    throw err;
  }
}

/**
 * Create a pickup request
 */
export async function createPickupRequest(params: {
  pickupLocation: string;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HHMM-HHMM e.g., "0900-1800"
  expectedPackageCount?: number;
}): Promise<{
  success: boolean;
  pickupId?: string;
  message?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const url = `${DELHIVERY_API_BASE}/fm/request/new/`;
    const formData = new URLSearchParams();
    formData.append("pickup_location", params.pickupLocation);
    formData.append("pickup_date", params.pickupDate);
    formData.append("pickup_time", params.pickupTime);
    if (params.expectedPackageCount) {
      formData.append(
        "expected_package_count",
        params.expectedPackageCount.toString(),
      );
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      pickupId: data.pickup_request_id,
      message: "Pickup request created successfully",
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery create pickup request error:", err);
    throw err;
  }
}

/**
 * Generate shipping label
 */
export async function generateShippingLabel(waybills: string[]): Promise<{
  success: boolean;
  pdfUrl?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    const waybillParam = waybills.join(",");
    const url = `${DELHIVERY_API_BASE}/api/p/packing_slip?wbns=${encodeURIComponent(waybillParam)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    // The response is a PDF file
    return {
      success: true,
      pdfUrl: url, // Return the URL so it can be downloaded
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery generate label error:", err);
    throw err;
  }
}

/**
 * Download document (POD, QC images, etc.)
 */
export async function downloadDocument(
  waybill: string,
  documentType: "pod" | "qc",
): Promise<{
  success: boolean;
  documentUrl?: string;
  error?: string;
}> {
  const token = env.DELHIVERY_TOKEN;
  if (!token) {
    throw new Error("DELHIVERY_TOKEN not configured");
  }

  try {
    let url: string;

    if (documentType === "pod") {
      // Download Proof of Delivery
      url = `${DELHIVERY_API_BASE}/api/p/pod?wbns=${encodeURIComponent(waybill)}`;
    } else {
      // Download QC images
      url = `${DELHIVERY_API_BASE}/api/p/qc-images?wbns=${encodeURIComponent(waybill)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    return {
      success: true,
      documentUrl: url,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Delhivery download document error:", err);
    throw err;
  }
}
