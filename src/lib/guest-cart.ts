export type GuestCartItem = {
  productId: string;
  quantity: number;
  variantId?: string;
  name?: string;
  price?: number;
  image?: string;
};

type GuestCart = {
  items: GuestCartItem[];
  /** ISO timestamp of when the cart was first created */
  createdAt?: string;
};

const GUEST_CART_KEY = "guestCart";
/** 7 days in milliseconds */
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const safeParse = (value: string | null): GuestCart => {
  if (!value) return { items: [] };
  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.items)) {
      // Enforce 7-day expiry
      if (parsed.createdAt) {
        const age = Date.now() - new Date(parsed.createdAt).getTime();
        if (age > EXPIRY_MS) {
          // Cart is stale — clear it silently
          if (typeof window !== "undefined") {
            localStorage.removeItem(GUEST_CART_KEY);
          }
          return { items: [] };
        }
      }
      return { items: parsed.items, createdAt: parsed.createdAt } as GuestCart;
    }
  } catch {
    // ignore
  }
  return { items: [] };
};

const canUseStorage = () => typeof window !== "undefined";

export const getGuestCart = (): GuestCart => {
  if (!canUseStorage()) return { items: [] };
  return safeParse(localStorage.getItem(GUEST_CART_KEY));
};

const saveGuestCart = (cart: GuestCart) => {
  if (!canUseStorage()) return;
  // Stamp createdAt on first write so the 7-day expiry clock starts
  if (!cart.createdAt) {
    cart.createdAt = new Date().toISOString();
  }
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
};

export const clearGuestCart = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem(GUEST_CART_KEY);
  window.dispatchEvent(new Event("cart-updated"));
};

const normalizeItemKey = (productId: any, variantId?: any): string => {
  const pid = (typeof productId === "object" && productId?._id ? productId._id : productId)?.toString?.() || "";
  const vid = variantId !== undefined && variantId !== null && variantId !== "undefined" && variantId !== -1 && variantId !== "-1" ? String(variantId) : "";
  return `${pid}:${vid}`;
};

export const addToGuestCart = (item: GuestCartItem) => {
  const cart = getGuestCart();
  const key = normalizeItemKey(item.productId, item.variantId);
  const existing = cart.items.find(
    (it) => normalizeItemKey(it.productId, it.variantId) === key,
  );
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.items.push({ ...item });
  }
  saveGuestCart(cart);
  return cart;
};

export const updateGuestCartItem = (
  productId: string,
  quantity: number,
  variantId?: string,
) => {
  const cart = getGuestCart();
  const key = normalizeItemKey(productId, variantId);
  cart.items = cart.items
    .map((it) => {
      if (normalizeItemKey(it.productId, it.variantId) !== key) return it;
      return { ...it, quantity };
    })
    .filter((it) => it.quantity > 0);
  saveGuestCart(cart);
  return cart;
};

export const removeGuestCartItem = (productId: string, variantId?: string) => {
  const cart = getGuestCart();
  const key = normalizeItemKey(productId, variantId);
  cart.items = cart.items.filter(
    (it) => normalizeItemKey(it.productId, it.variantId) !== key,
  );
  saveGuestCart(cart);
  return cart;
};

export const hasGuestCartItems = () => getGuestCart().items.length > 0;
