const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  suppressAuthRedirect?: boolean;
};

interface ApiResponse<T> {
  data?: T;
  products?: T;
  error?: string;
  message?: string;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountedPrice?: number;
  salePrice?: number;
  image: string;
  weight?: number;
  metaTitle?: string;
  metaDescription?: string;
  variants?: Array<{
    name: string;
    options: string[];
  }>;
}

interface CartItem {
  _id: string;
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number;
}

interface Order {
  _id: string;
  orderId: string;
  orderNo?: string;
  userId?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressId?: string;
  items: CartItem[];
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode?: string;
  status: string;
  paymentStatus: string;
  total?: number;
  netAmount?: number;
  subtotal: number;
  taxAmount?: number;
  shippingCost?: number;
  deliveryCharge?: number;
  discount?: number;
  couponAmount?: number;
  razorpayOrderId?: string;
  delhiveryTrackingId?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id?: string;
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: string;
}

interface PaymentOrder {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: string;
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  gstNumber?: string;
  notes?: string;
}

async function apiCall<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth, suppressAuthRedirect, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string>),
  };

  // Add authorization token from localStorage if available
  if (typeof window !== "undefined" && !skipAuth) {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOpts,
    headers,
    credentials: "include", // Send cookies for auth
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401 && typeof window !== "undefined") {
      if (!suppressAuthRedirect) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      throw new Error("Authentication required");
    }
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "API error");
  }

  const data = await response.json();
  return data as T;
}

export async function getProducts(
  limit = 12,
  offset = 0,
  categoryId?: string,
): Promise<ApiResponse<Product[]>> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (categoryId) params.append("categoryId", categoryId);

  return apiCall<ApiResponse<Product[]>>(`/products?${params.toString()}`, {
    skipAuth: true,
  });
}

export async function getProduct(
  idOrSlug: string,
): Promise<ApiResponse<Product>> {
  return apiCall<ApiResponse<Product>>(`/products/${idOrSlug}`, {
    skipAuth: true,
  });
}

export async function getCategories(): Promise<ApiResponse<any[]>> {
  return apiCall<ApiResponse<any[]>>("/categories", { skipAuth: true });
}

export async function getCart(): Promise<ApiResponse<Cart>> {
  return apiCall<ApiResponse<Cart>>("/cart");
}

export async function addToCart(
  productId: string,
  quantity: number,
  variantId?: string,
): Promise<ApiResponse<Cart>> {
  return apiCall<ApiResponse<Cart>>("/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity, variantId }),
  });
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<ApiResponse<Cart>> {
  return apiCall<ApiResponse<Cart>>(`/cart/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeFromCart(
  itemId: string,
): Promise<ApiResponse<Cart>> {
  return apiCall<ApiResponse<Cart>>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function getOrders(): Promise<ApiResponse<Order[]>> {
  return apiCall<ApiResponse<Order[]>>("/orders", {
    suppressAuthRedirect: true,
  });
}

export async function getOrder(orderId: string): Promise<ApiResponse<Order>> {
  return apiCall<ApiResponse<Order>>(`/orders/${orderId}`);
}

export async function createOrder(data: {
  addressId: string;
  paymentMethod?: string;
  couponCode?: string;
  shippingCost?: number;
}): Promise<ApiResponse<Order>> {
  return apiCall<ApiResponse<Order>>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createPaymentOrder(
  orderId: string,
): Promise<PaymentOrder> {
  return apiCall<PaymentOrder>("/payments/order", {
    method: "POST",
    body: JSON.stringify({ orderId, currency: "INR" }),
  });
}

export async function getInvoice(
  invoiceId: string,
): Promise<{ invoice: Invoice } | ApiResponse<Invoice>> {
  return apiCall<{ invoice: Invoice } | ApiResponse<Invoice>>(
    `/invoices/${invoiceId}`,
    { skipAuth: true },
  );
}

export async function deleteOrder(
  orderId: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiCall<ApiResponse<{ success: boolean }>>(`/orders/${orderId}`, {
    method: "DELETE",
  });
}

// Auth functions
export async function login(
  email: string,
  password: string,
): Promise<ApiResponse<{ user: User; token: string }>> {
  return apiCall<ApiResponse<{ user: User; token: string }>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<ApiResponse<{ user: User; token: string }>> {
  return apiCall<ApiResponse<{ user: User; token: string }>>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<ApiResponse<{ message: string }>> {
  return apiCall<ApiResponse<{ message: string }>>("/auth/logout", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return apiCall<ApiResponse<User>>("/auth/me", {
    suppressAuthRedirect: true,
  });
}

export async function updateProfile(data: {
  name?: string;
  phone?: string;
  email?: string;
}): Promise<ApiResponse<{ message: string }>> {
  return apiCall<ApiResponse<{ message: string }>>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiCall<ApiResponse<{ message: string }>>("/auth/reset-request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiCall<ApiResponse<{ message: string }>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

// Delhivery Shipping API
export interface PincodeServiceability {
  serviceable: boolean;
  isCOD: boolean;
  isPrepaid: boolean;
  city?: string;
  state?: string;
  remark?: string; // "Embargo" indicates temporary non-serviceability
}

export interface ExpectedTat {
  expectedTat?: number;
  expected_delivery_date?: string;
  remarks?: string;
  [key: string]: any;
}

export interface ShippingCharges {
  total_amount?: number;
  delivery_charges?: number;
  cod_charges?: number;
  weight?: number;
  [key: string]: any;
}

export interface TrackingStatus {
  ShipmentData: Array<{
    Shipment: {
      Status: {
        Status: string;
        StatusType: string;
        StatusDateTime: string;
        StatusLocation: string;
        Instructions?: string;
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
      ReferenceNo?: string;
      ScanDetail?: {
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

export async function checkPincodeServiceability(
  pincode: string,
): Promise<ApiResponse<PincodeServiceability>> {
  return apiCall<ApiResponse<PincodeServiceability>>(
    "/delhivery/check-pincode",
    {
      method: "POST",
      body: JSON.stringify({ pincode }),
      skipAuth: true,
    },
  );
}

export async function trackShipment(
  waybill: string,
): Promise<ApiResponse<TrackingStatus>> {
  return apiCall<ApiResponse<TrackingStatus>>(`/delhivery/track/${waybill}`);
}

export async function trackOrderShipment(
  orderId: string,
): Promise<
  ApiResponse<TrackingStatus & { order: { orderId: string; status: string } }>
> {
  return apiCall<
    ApiResponse<TrackingStatus & { order: { orderId: string; status: string } }>
  >(`/delhivery/track-order/${orderId}`);
}

export async function getExpectedTat(params: {
  originPin?: string;
  destinationPin: string;
  mot?: string;
  pdt?: string;
  expectedPickupDate?: string;
}): Promise<ApiResponse<ExpectedTat>> {
  return apiCall<ApiResponse<ExpectedTat>>("/delhivery/expected-tat", {
    method: "POST",
    body: JSON.stringify(params),
    skipAuth: true,
  });
}

export async function getShippingCharges(params: {
  originPin?: string;
  destinationPin: string;
  weight: number;
  paymentMode?: "Pre-paid" | "COD";
  codAmount?: number;
}): Promise<ApiResponse<ShippingCharges>> {
  return apiCall<ApiResponse<ShippingCharges>>("/delhivery/shipping-charges", {
    method: "POST",
    body: JSON.stringify(params),
    skipAuth: true,
  });
}

// Admin Delhivery API
export interface CreateShipmentRequest {
  orderId: string;
  pickupLocation?: string;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  productsDescription?: string;
}

export interface ShipmentResponse {
  success: boolean;
  waybill?: string;
  orderId?: string;
  message?: string;
  error?: string;
}

export async function createShipment(
  data: CreateShipmentRequest,
): Promise<ApiResponse<ShipmentResponse>> {
  return apiCall<ApiResponse<ShipmentResponse>>("/delhivery/create-shipment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelShipment(
  waybill: string,
): Promise<ApiResponse<{ success: boolean; message?: string }>> {
  return apiCall<ApiResponse<{ success: boolean; message?: string }>>(
    "/delhivery/cancel-shipment",
    {
      method: "POST",
      body: JSON.stringify({ waybill }),
    },
  );
}

export async function getPickupLocations(): Promise<
  ApiResponse<
    Array<{
      name: string;
      pin: string;
      add: string;
      city: string;
      state: string;
    }>
  >
> {
  return apiCall<
    ApiResponse<
      Array<{
        name: string;
        pin: string;
        add: string;
        city: string;
        state: string;
      }>
    >
  >("/delhivery/pickup-locations");
}

export async function getPendingShipments(): Promise<ApiResponse<Order[]>> {
  return apiCall<ApiResponse<Order[]>>("/admin/shipments/pending");
}

export async function getActiveShipments(): Promise<ApiResponse<Order[]>> {
  return apiCall<ApiResponse<Order[]>>("/admin/shipments/active");
}

export async function bulkCreateShipments(data: {
  orderIds: string[];
  pickupLocation?: string;
  defaultWeight?: string;
}): Promise<
  ApiResponse<
    Array<{
      orderId: string;
      success: boolean;
      waybill?: string;
      error?: string;
    }>
  >
> {
  return apiCall<
    ApiResponse<
      Array<{
        orderId: string;
        success: boolean;
        waybill?: string;
        error?: string;
      }>
    >
  >("/admin/shipments/bulk-create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export const api = {
  // Products
  getProducts,
  getProduct,
  getCategories,

  // Cart
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,

  // Orders
  getOrders,
  getOrder,
  createOrder,
  deleteOrder,

  // Payments
  createPaymentOrder,

  // Auth
  login,
  register,
  logout,
  getCurrentUser,
  updateProfile,
  requestPasswordReset,
  resetPassword,

  // Delhivery Shipping
  checkPincodeServiceability,
  trackShipment,
  trackOrderShipment,
  getExpectedTat,
  getShippingCharges,
  createShipment,
  cancelShipment,
  getPickupLocations,
  getPendingShipments,
  getActiveShipments,
  bulkCreateShipments,
};
