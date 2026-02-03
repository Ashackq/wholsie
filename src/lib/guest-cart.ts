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
};

const GUEST_CART_KEY = "guestCart";

const safeParse = (value: string | null): GuestCart => {
  if (!value) return { items: [] };
  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items } as GuestCart;
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
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};

export const clearGuestCart = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem(GUEST_CART_KEY);
};

export const addToGuestCart = (item: GuestCartItem) => {
  const cart = getGuestCart();
  const key = `${item.productId}:${item.variantId ?? ""}`;
  const existing = cart.items.find(
    (it) => `${it.productId}:${it.variantId ?? ""}` === key,
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
  const key = `${productId}:${variantId ?? ""}`;
  cart.items = cart.items
    .map((it) => {
      if (`${it.productId}:${it.variantId ?? ""}` !== key) return it;
      return { ...it, quantity };
    })
    .filter((it) => it.quantity > 0);
  saveGuestCart(cart);
  return cart;
};

export const removeGuestCartItem = (productId: string, variantId?: string) => {
  const cart = getGuestCart();
  const key = `${productId}:${variantId ?? ""}`;
  cart.items = cart.items.filter(
    (it) => `${it.productId}:${it.variantId ?? ""}` !== key,
  );
  saveGuestCart(cart);
  return cart;
};

export const hasGuestCartItems = () => getGuestCart().items.length > 0;
