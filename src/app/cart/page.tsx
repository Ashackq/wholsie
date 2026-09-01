"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getCart,
  removeFromCart,
  updateCartItem,
  addToCart,
  getCurrentUser,
  getProduct as getProductDetail,
  applyCouponToCart,
  removeCouponFromCart,
  availCartOffer,
  removeCartOffer,
} from "@/lib/api";
import { resolveProductImage, resolveProductPrice } from "@/lib/product-utils";
import {
  clearGuestCart,
  getGuestCart,
  removeGuestCartItem,
  updateGuestCartItem,
  setGuestCartOfferAvailed,
} from "@/lib/guest-cart";

type CartProduct = {
  _id?: string;
  name?: string;
  category?: { name?: string };
  basePrice?: number;
  salePrice?: number;
  discountedPrice?: number;
  image?: string;
  images?: Array<string | { url?: string; src?: string; image?: string }>;
  variants?: Array<{
    price?: number;
    label?: string;
    name?: string;
    option?: string;
  }>;
};

type CartItem = {
  _id: string;
  productId: string;
  quantity: number;
  variantIndex?: number;
  price?: number;
  name?: string;
  product?: CartProduct;
};

// Grouped item for merging duplicates
interface GroupedItem {
  key: string;
  mergedIds: string[];
  productId: string;
  variantIndex?: number;
  quantity: number;
  product?: CartProduct;
  name?: string;
  unitPrice: number;
}

type CartResponse = {
  items: CartItem[];
  totalItems?: number;
  estimatedTotal?: number;
};

const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

const getProductIdString = (raw: any): string => {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (raw._id) return getProductIdString(raw._id);
    if (raw.id) return getProductIdString(raw.id);
  }
  return String(raw);
};

// Merge duplicate items by productId + variantIndex
// Use fetched products for complete data
const groupCartItems = (
  items: CartItem[],
  fullProducts: Record<string, CartProduct>,
): GroupedItem[] => {
  const map = new Map<string, GroupedItem>();
  for (const item of items) {
    const pid = getProductIdString(item.productId);
    const vIdx =
      item.variantIndex !== undefined && item.variantIndex !== null
        ? item.variantIndex
        : -1;
    const key = `${pid}:${vIdx}`;

    // Get fetched product for complete details
    const fullProduct = (pid ? fullProducts[pid] : null) || item.product;

    // Use price from fetched product if available
    const unitPrice = fullProduct
      ? resolveProductPrice(fullProduct)
      : item.price || 0;

    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      if (item._id && !existing.mergedIds.includes(item._id)) {
        existing.mergedIds.push(item._id);
      }
      // Prefer fetched product over API data
      existing.product =
        (pid ? fullProducts[pid] : null) || existing.product || item.product;
      existing.name = existing.name || item.name || fullProduct?.name;
      // If unit price was 0 and we found a non-zero, update
      if (!existing.unitPrice && unitPrice) existing.unitPrice = unitPrice;
    } else {
      map.set(key, {
        key,
        mergedIds: item._id ? [item._id] : [],
        productId: pid,
        variantIndex: item.variantIndex,
        quantity: item.quantity,
        product: fullProduct,
        name: item.name || fullProduct?.name,
        unitPrice,
      });
    }
  }
  return Array.from(map.values());
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [fullProducts, setFullProducts] = useState<Record<string, CartProduct>>(
    {},
  );

  // Enriched cart fields from server (Phase 11)
  const [offerDiscount, setOfferDiscount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [availableOffer, setAvailableOffer] = useState<{
    offerId: string;
    offerTitle: string;
    offerSlug: string;
    discountAmount: number;
    description?: string;
    badgeText?: string;
    ruleType?: string;
    freeItemsPreview?: Array<{ productName: string; productImage?: string; quantity: number }>;
  } | null>(null);
  const [isOfferAvailed, setIsOfferAvailed] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState("");
  const [appliedOffers, setAppliedOffers] = useState<Array<{ offerTitle: string; discountAmount: number; offerSlug?: string }>>([]);
  const [freeItems, setFreeItems] = useState<Array<{ productName: string; productImage?: string; quantity: number; isOutOfStock: boolean; unitPrice: number }>>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponWarnings, setCouponWarnings] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // Inline Guest Checkout Authentication State
  const [showGuestAuth, setShowGuestAuth] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestOtp, setGuestOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [guestOtpStep, setGuestOtpStep] = useState<"details" | "otp">("details");
  const [guestAgree, setGuestAgree] = useState(true);
  const [guestAuthLoading, setGuestAuthLoading] = useState(false);
  const [guestAuthError, setGuestAuthError] = useState("");
  const [guestDevOtp, setGuestDevOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const guestAuthRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleProceedToCheckout = () => {
    const isLoggedIn =
      typeof window !== "undefined" &&
      (!!localStorage.getItem("authToken") || !!localStorage.getItem("user"));

    if (isLoggedIn) {
      router.push("/checkout");
    } else {
      setShowGuestAuth(true);
      setGuestAuthError("");
      setTimeout(() => {
        guestAuthRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const handleRequestGuestOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!guestName.trim()) {
      setGuestAuthError("Please enter your full name.");
      return;
    }
    if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setGuestAuthError("Please enter a valid email address.");
      return;
    }
    const cleanPhone = guestPhone.replace(/[^0-9]/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      setGuestAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!guestAgree) {
      setGuestAuthError("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }

    setGuestAuthError("");
    setGuestAuthLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/auth/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      if (data.otp) {
        setGuestDevOtp(data.otp);
      }
      setGuestOtpStep("otp");
      setGuestOtp(["", "", "", "", "", ""]);
      setResendTimer(30);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setGuestAuthError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setGuestAuthLoading(false);
    }
  };

  const handleVerifyGuestOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = guestOtp.join("");
    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setGuestAuthError("Please enter the complete 6-digit OTP.");
      return;
    }

    const cleanPhone = guestPhone.replace(/[^0-9]/g, "");
    setGuestAuthError("");
    setGuestAuthLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/auth/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            phone: cleanPhone,
            otp: fullOtp,
            name: guestName.trim(),
            email: guestEmail.trim(),
            rememberMe: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      // Persist auth
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      // Merge guest cart into server database cart
      const guestCart = getGuestCart();
      if (guestCart.items && guestCart.items.length > 0) {
        await Promise.all(
          guestCart.items.map((item) =>
            addToCart(item.productId, item.quantity, item.variantId)
          )
        );
        if (guestCart.isOfferAvailed) {
          try {
            await availCartOffer();
          } catch {
            // non-fatal
          }
        }
        clearGuestCart();
      }

      // Refresh cached user profile
      try {
        const profile = await getCurrentUser();
        const u = (profile as any)?.data || profile;
        if (u) localStorage.setItem("user", JSON.stringify(u));
      } catch {
        // non-fatal
      }

      // Notify header and layout components
      window.dispatchEvent(new Event("cart-updated"));

      // Navigate directly to checkout
      router.push("/checkout");
    } catch (err: any) {
      setGuestAuthError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setGuestAuthLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(-1);
    const newArr = [...guestOtp];
    newArr[index] = cleaned;
    setGuestOtp(newArr);
    setGuestAuthError("");
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!guestOtp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const newArr = [...guestOtp];
        newArr[index] = "";
        setGuestOtp(newArr);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newArr = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) {
        newArr[i] = pasted[i];
      }
      setGuestOtp(newArr);
      setTimeout(() => {
        otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
      }, 0);
    }
  };

  // Fetch full product details if not already fetched
  const getFullProduct = useCallback(
    async (productId: string): Promise<CartProduct | undefined> => {
      // Check if already fetched
      if (fullProducts[productId]) return fullProducts[productId];

      // Fetch from API
      try {
        const response = await getProductDetail(productId);
        const product = (response as any)?.data || response;
        if (product?._id) {
          setFullProducts((prev) => ({ ...prev, [productId]: product }));
          return product;
        }
      } catch (err) {
        console.error(`Failed to fetch product ${productId}:`, err);
      }
      return undefined;
    },
    [fullProducts],
  );

  const attachProductDetails = useCallback(
    (payload: any): CartResponse => {
      const items = (payload?.items ?? []).map((item: any) => {
        const productId = getProductIdString(
          item.productId || (item.product as any)?._id
        );
        const fullProduct = productId ? fullProducts[productId] : undefined;
        const mergedProduct = {
          ...(fullProduct || {}),
          ...(item.product || {}),
          _id: productId || (fullProduct as any)?._id,
        } as CartProduct;

        return {
          ...item,
          _id: item._id?.toString?.() || `${productId}:${item.variantIndex ?? ""}`,
          productId,
          product: mergedProduct,
        } as CartItem;
      });

      return { ...(payload || {}), items } as CartResponse;
    },
    [fullProducts],
  );

  const mapGuestItems = useCallback((items: any[]): CartItem[] => {
    return items.map((item) => {
      const productId = getProductIdString(item.productId);
      const vId =
        item.variantId !== undefined &&
        item.variantId !== null &&
        item.variantId !== "undefined" &&
        item.variantId !== -1 &&
        item.variantId !== "-1"
          ? String(item.variantId)
          : "";
      return {
        _id: `${productId}:${vId}`,
        productId,
        quantity: Number(item.quantity) || 1,
        variantIndex: vId !== "" ? Number(vId) : undefined,
        price: item.price,
        name: item.name,
        product: item.image || item.name ? { image: item.image, name: item.name } : undefined,
      } as CartItem;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchedProductIds = new Set<string>();

    const loadCart = async () => {
      try {
        const isLoggedIn =
          !!localStorage.getItem("authToken") ||
          !!localStorage.getItem("user");

        if (!isLoggedIn) {
          const guestCart = getGuestCart();
          const guestItems = guestCart.items || [];
          const normalized = attachProductDetails({
            items: mapGuestItems(guestItems),
          });
          if (mounted) setCart(normalized);

          if (guestItems.length > 0) {
            try {
              const isGuestOfferAvailed = Boolean(guestCart.isOfferAvailed);
              const calcRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/cart/calculate`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items: guestItems, isOfferAvailed: isGuestOfferAvailed }),
                }
              );
              const calcJson = await calcRes.json();
              if (mounted && calcJson.success && calcJson.data) {
                setAvailableOffer(calcJson.data.availableOffer ?? null);
                setIsOfferAvailed(calcJson.data.isOfferAvailed ?? false);
                setOfferDiscount(calcJson.data.offerDiscount ?? 0);
                setAppliedOffers(calcJson.data.appliedOffers ?? []);
                setFreeItems(calcJson.data.freeItems ?? []);
                setCouponWarnings(calcJson.data.warnings ?? []);
              }
            } catch {
              // ignore
            }
          } else {
            if (mounted) {
              setAvailableOffer(null);
              setIsOfferAvailed(false);
              setOfferDiscount(0);
              setAppliedOffers([]);
              setFreeItems([]);
            }
          }

          // Fetch product details for guest items
          const itemsToFetch = (normalized.items || []).filter((item) => {
            const fetched = fullProducts[item.productId];
            return !fetched || !fetched.image;
          });

          if (itemsToFetch.length > 0) {
            for (const item of itemsToFetch) {
              if (mounted && !fetchedProductIds.has(item.productId)) {
                fetchedProductIds.add(item.productId);
                await getFullProduct(item.productId);
              }
            }
          }
          return;
        }

        const response = await getCart();
        const payload = (response as any).data || response;
        const normalized = attachProductDetails(payload);
        if (mounted) {
          setCart(normalized);
          // Pull enriched fields from the server response
          setAvailableOffer(payload.availableOffer ?? null);
          setIsOfferAvailed(payload.isOfferAvailed ?? false);
          setOfferDiscount(payload.offerDiscount ?? 0);
          setCouponDiscount(payload.couponDiscount ?? 0);
          setAppliedOffers(payload.appliedOffers ?? []);
          setFreeItems(payload.freeItems ?? []);
          setAppliedCoupon(payload.appliedCoupon ?? null);
          setCouponWarnings(payload.warnings ?? []);
          if (payload.appliedCoupon?.code) {
            setCouponInput(payload.appliedCoupon.code);
          }
        }

        // Fetch full product details for items without complete data
        const itemsToFetch = (normalized.items || []).filter((item) => {
          const fetched = fullProducts[item.productId];
          return !fetched || !fetched.image; // Missing image = incomplete product
        });

        if (itemsToFetch.length > 0) {
          for (const item of itemsToFetch) {
            if (mounted && !fetchedProductIds.has(item.productId)) {
              fetchedProductIds.add(item.productId);
              await getFullProduct(item.productId);
            }
          }
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load cart.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCart();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshCart = async () => {
    const isLoggedIn =
      !!localStorage.getItem("authToken") || !!localStorage.getItem("user");
    if (!isLoggedIn) {
      const guestCart = getGuestCart();
      const guestItems = guestCart.items || [];
      const isGuestOfferAvailed = Boolean(guestCart.isOfferAvailed);
      const normalized = attachProductDetails({
        items: mapGuestItems(guestItems),
      });
      setCart(normalized);

      if (guestItems.length > 0) {
        try {
          const calcRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/cart/calculate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: guestItems, isOfferAvailed: isGuestOfferAvailed }),
            }
          );
          const calcJson = await calcRes.json();
          if (calcJson.success && calcJson.data) {
            setAvailableOffer(calcJson.data.availableOffer ?? null);
            setIsOfferAvailed(calcJson.data.isOfferAvailed ?? false);
            setOfferDiscount(calcJson.data.offerDiscount ?? 0);
            setAppliedOffers(calcJson.data.appliedOffers ?? []);
            setFreeItems(calcJson.data.freeItems ?? []);
            setCouponWarnings(calcJson.data.warnings ?? []);
          }
        } catch {
          // ignore
        }
      } else {
        setAvailableOffer(null);
        setIsOfferAvailed(false);
        setOfferDiscount(0);
        setAppliedOffers([]);
        setFreeItems([]);
      }
      return;
    }
    const response = await getCart();
    const payload = (response as any).data || response;
    const normalized = attachProductDetails(payload);
    setCart(normalized);
    // Refresh enriched fields too
    setAvailableOffer(payload.availableOffer ?? null);
    setIsOfferAvailed(payload.isOfferAvailed ?? false);
    setOfferDiscount(payload.offerDiscount ?? 0);
    setCouponDiscount(payload.couponDiscount ?? 0);
    setAppliedOffers(payload.appliedOffers ?? []);
    setFreeItems(payload.freeItems ?? []);
    setAppliedCoupon(payload.appliedCoupon ?? null);
    setCouponWarnings(payload.warnings ?? []);
  };

  const groups = useMemo(
    () => groupCartItems(cart?.items ?? [], fullProducts),
    [cart, fullProducts],
  );

  const handleQuantityChangeGroup = async (
    group: GroupedItem,
    quantity: number,
  ) => {
    // If quantity is reduced to 0 or less, remove the item from cart
    if (quantity <= 0) {
      await handleRemoveGroup(group);
      return;
    }

    const safeQuantity = Number.isNaN(quantity) ? 1 : quantity;
    setUpdatingItemId(group.mergedIds[0] || group.key);

    const isLoggedIn =
      !!localStorage.getItem("authToken") || !!localStorage.getItem("user");
    if (!isLoggedIn) {
      updateGuestCartItem(
        group.productId,
        safeQuantity,
        group.variantIndex !== undefined ? String(group.variantIndex) : undefined,
      );
      await refreshCart();
      setUpdatingItemId(null);
      return;
    }

    // Optimistic UI update
    setCart((prev) => {
      if (!prev) return prev;
      const items = (prev.items || []).map((it) => {
        if (group.mergedIds.includes(it._id)) {
          // Keep the first id; others will be removed
          if (it._id === group.mergedIds[0])
            return { ...it, quantity: safeQuantity } as CartItem;
          return it;
        }
        return it;
      });
      return { ...prev, items };
    });

    try {
      await updateCartItem(group.mergedIds[0], safeQuantity);
      // Remove duplicates
      for (let i = 1; i < group.mergedIds.length; i++) {
        await removeFromCart(group.mergedIds[i]);
      }
      await refreshCart();
    } catch (e: any) {
      setError(e?.message || "Failed to update quantity.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveGroup = async (group: GroupedItem) => {
    setUpdatingItemId(group.mergedIds[0] || group.key);
    try {
      const isLoggedIn =
        !!localStorage.getItem("authToken") || !!localStorage.getItem("user");
      if (!isLoggedIn) {
        removeGuestCartItem(
          group.productId,
          group.variantIndex !== undefined && group.variantIndex !== null
            ? String(group.variantIndex)
            : undefined,
        );
        await refreshCart();
        return;
      }
      for (const id of group.mergedIds) {
        if (id && !id.includes(":")) {
          await removeFromCart(id);
        }
      }
      await refreshCart();
    } catch (e: any) {
      setError("Failed to remove item(s).");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const summary = useMemo(() => {
    const subtotal = groups.reduce(
      (sum, g) => sum + g.unitPrice * g.quantity,
      0,
    );
    const adjustedSubtotal = Math.max(0, subtotal - offerDiscount - couponDiscount);
    return { subtotal, offerDiscount, couponDiscount, total: adjustedSubtotal };
  }, [groups, offerDiscount, couponDiscount]);

  const isLoggedInUser = () =>
    typeof window !== "undefined" &&
    (!!localStorage.getItem("authToken") || !!localStorage.getItem("user"));

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (!isLoggedInUser()) {
      setCouponError("Please sign in at checkout to apply coupons.");
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const res = await applyCouponToCart(couponInput.trim().toUpperCase());
      if (res.success) {
        setCouponSuccess(res.message || "Coupon applied!");
        await refreshCart();
      } else {
        setCouponError(res.error || "Failed to apply coupon.");
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to apply coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      await removeCouponFromCart();
      setCouponInput("");
      setAppliedCoupon(null);
      setCouponDiscount(0);
      await refreshCart();
    } catch (err: any) {
      setCouponError(err.message || "Failed to remove coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleAvailOffer = async () => {
    const isLoggedIn =
      typeof window !== "undefined" &&
      (!!localStorage.getItem("authToken") || !!localStorage.getItem("user"));
    setOfferLoading(true);
    setOfferSuccess("");
    setCouponError("");
    try {
      if (!isLoggedIn) {
        setGuestCartOfferAvailed(true);
        setIsOfferAvailed(true);
        await refreshCart();
        setOfferSuccess("Offer applied to your cart!");
      } else {
        const res = await availCartOffer();
        if (res.success) {
          setOfferSuccess(res.message || "Offer applied!");
          await refreshCart();
        } else {
          setError(res.error || "Failed to avail offer.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to avail offer.");
    } finally {
      setOfferLoading(false);
      setTimeout(() => setOfferSuccess(""), 4000);
    }
  };

  const handleRemoveOffer = async () => {
    const isLoggedIn =
      typeof window !== "undefined" &&
      (!!localStorage.getItem("authToken") || !!localStorage.getItem("user"));
    setOfferLoading(true);
    setOfferSuccess("");
    try {
      if (!isLoggedIn) {
        setGuestCartOfferAvailed(false);
        setIsOfferAvailed(false);
        await refreshCart();
      } else {
        const res = await removeCartOffer();
        if (res.success) {
          await refreshCart();
        } else {
          setError(res.error || "Failed to remove offer.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove offer.");
    } finally {
      setOfferLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="mt_55 mb_100">
        <div className="container">
          <p>Loading your cart...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt_55 mb_100">
        <div className="container">
          <p className="text-danger">{error}</p>
        </div>
      </section>
    );
  }

  const hasItems = groups.length > 0;

  return (
    <>
      <section
        className="page_banner"
        style={{ background: "url(/assets/images/bannerOther.jpg)" }}
      >
        <div className="page_banner_overlay">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="page_banner_text wow fadeInUp">
                  <h1>Cart</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cart_page mt_100 mb_100">
        <div className="container">
          {!hasItems ? (
            <div className="cartfont" style={{ textAlign: "center" }}>
              <p
                style={{
                  padding: "8px",
                  width: "100%",
                  color: "#2F3443",
                  opacity: 0.5,
                  fontWeight: 600,
                  fontSize: "24px",
                  fontFamily: "Poppins",
                }}
              >
                Your Cart Is Empty
              </p>
              <div style={{ margin: "0 auto", maxWidth: 280 }}>
                <Image
                  src="/assets/images/emptycart.png"
                  alt="Empty cart"
                  width={260}
                  height={200}
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
              <div
                className="checkout-cart-section-container"
                style={{ marginTop: 16 }}
              >
                <div
                  style={{
                    color: "#2F3443",
                    opacity: 0.75,
                    fontWeight: 600,
                    fontSize: 18,
                    fontFamily: "Poppins",
                  }}
                >
                  Add items and get them delivered with ease
                  <br />
                  <br />
                  <Link href="/products" className="common_btn go_btn">
                    Checkout Products
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="row">
                <div className="col-lg-8">
                  <div className="cart_table_area">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="cart_page_img">Product</th>
                            <th className="cart_page_price">Price</th>
                            <th className="cart_page_quantity">Quantity</th>
                            <th className="cart_page_total">Total</th>
                            <th className="cart_page_action"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((group) => {
                            // Get full product from previously fetched
                            const fetched = fullProducts[group.productId];
                            const fullProduct = fetched || group.product;

                            const price = group.unitPrice;
                            const lineTotal = price * group.quantity;
                            const name =
                              fullProduct?.name ?? group.name ?? "Product";
                            const categoryName = fullProduct?.category?.name;
                            const imageSrc = fullProduct?.image || "";

                            return (
                              <tr key={group.key}>
                                <td className="cart_page_details">
                                  <div className="row align-items-center g-3">
                                    <div className="col-md-4 cart_page_img">
                                      <div className="img">
                                        <Image
                                          src={"/" + imageSrc}
                                          alt={name}
                                          width={120}
                                          height={120}
                                          className="img-fluid w-100"
                                          style={{ objectFit: "cover" }}
                                          priority={false}
                                        />
                                      </div>
                                    </div>
                                    <div className="col-md-8">
                                      <p>{name}</p>
                                      {categoryName && (
                                        <span>
                                          <b>Category:</b> {categoryName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="cart_page_price">
                                  <h3>{formatCurrency(price)}</h3>
                                </td>
                                <td className="cart_page_quantity">
                                  <div
                                    className="cart_quantity d-flex align-items-center"
                                    style={{ gap: 10 }}
                                  >
                                    <button
                                      className="btn-quantity remove-meal"
                                      onClick={() =>
                                        handleQuantityChangeGroup(
                                          group,
                                          group.quantity - 1,
                                        )
                                      }
                                      disabled={
                                        updatingItemId === (group.mergedIds[0] || group.key)
                                      }
                                      style={{
                                        padding: "6px 10px",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      value={group.quantity}
                                      onChange={(e) =>
                                        handleQuantityChangeGroup(
                                          group,
                                          parseInt(e.target.value, 10),
                                        )
                                      }
                                      disabled={
                                        updatingItemId === (group.mergedIds[0] || group.key)
                                      }
                                      style={{
                                        width: 64,
                                        textAlign: "center",
                                        padding: "6px",
                                      }}
                                    />
                                    <button
                                      className="btn-quantity btnincreaseadd-meal"
                                      onClick={() =>
                                        handleQuantityChangeGroup(
                                          group,
                                          group.quantity + 1,
                                        )
                                      }
                                      disabled={
                                        updatingItemId === (group.mergedIds[0] || group.key)
                                      }
                                      style={{
                                        padding: "6px 10px",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="cart_page_total">
                                  <h3>{formatCurrency(lineTotal)}</h3>
                                </td>
                                <td className="cart_page_action">
                                  <button
                                    className="remove_btn"
                                    onClick={() => handleRemoveGroup(group)}
                                    disabled={
                                      updatingItemId === (group.mergedIds[0] || group.key)
                                    }
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "#777",
                                    }}
                                  >
                                    <i
                                      className="fa fa-trash"
                                      aria-hidden="true"
                                    ></i>{" "}
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="cart_page_summary" style={{ marginTop: 0 }}>
                    <h3>Order Summary</h3>
                    <ul>
                      {groups.map((group) => {
                        // Get full product from previously fetched
                        const fetched = fullProducts[group.productId];
                        const fullProduct = fetched || group.product;

                        const price = group.unitPrice;
                        const imageSrc = fullProduct?.image || "";
                        const name =
                          fullProduct?.name ?? group.name ?? "Product";
                        return (
                          <li key={`summary-${group.key}`}>
                            <div className="img">
                              <Image
                                src={"/" + imageSrc}
                                alt={name}
                                width={60}
                                height={60}
                                className="img-fluid w-100"
                                style={{ objectFit: "cover" }}
                              />
                            </div>
                            <div className="text">
                              <a>{name}</a>
                              <p>
                                {group.quantity} x {formatCurrency(price)}
                              </p>
                            </div>
                            <h6>{formatCurrency(price * group.quantity)}</h6>
                          </li>
                        );
                      })}

                      {/* Free items from offer engine (shown only when offer is availed) */}
                      {isOfferAvailed && freeItems.map((fi: any, idx) => (
                        <li key={`free-${idx}`} style={{ opacity: fi.isOutOfStock ? 0.6 : 1 }}>
                          <div className="img" style={{ position: "relative", width: 60, height: 60, borderRadius: 8, overflow: "hidden", background: "#f0fdf4", flexShrink: 0 }}>
                            {fi.productImage ? (
                              <Image
                                src={"/" + fi.productImage.replace(/^\/+/, "")}
                                alt={fi.productName}
                                width={60}
                                height={60}
                                className="img-fluid w-100"
                                style={{ objectFit: "cover", width: "60px", height: "60px" }}
                              />
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                <i className="fas fa-gift" style={{ color: "#16a34a", fontSize: 22 }} aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="text">
                            <a style={{ color: "#16a34a", fontWeight: 600 }}>
                              {fi.productName}
                              {fi.isOutOfStock && <span style={{ fontSize: 11, color: "#f97316", marginLeft: 6 }}>(OOS)</span>}
                            </a>
                            <p>{fi.quantity} x FREE 🎁</p>
                          </div>
                          <h6 style={{ color: "#16a34a" }}>₹0.00</h6>
                        </li>
                      ))}
                    </ul>

                    {/* Success notification when offer is availed */}
                    {offerSuccess && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#15803d", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="fas fa-check-circle" aria-hidden="true" />
                        <span>{offerSuccess}</span>
                      </div>
                    )}

                    {/* Available Offer Prompt (Eligible, but not yet availed) */}
                    {availableOffer && !isOfferAvailed && (
                      <div
                        style={{
                          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                          border: "1.5px dashed #f97316",
                          borderRadius: 12,
                          padding: "14px",
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>🎁</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: "#ea580c",
                                  color: "#ffffff",
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  letterSpacing: "0.5px",
                                  textTransform: "uppercase",
                                }}
                              >
                                {availableOffer.badgeText || "Special Offer"}
                              </span>
                              <strong style={{ fontSize: 13, color: "#9a3412" }}>
                                {availableOffer.offerTitle}
                              </strong>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: "#7c2d12", lineHeight: 1.4 }}>
                              {availableOffer.discountAmount > 0
                                ? `Avail this offer to save ${formatCurrency(availableOffer.discountAmount)} on your order!`
                                : availableOffer.freeItemsPreview && availableOffer.freeItemsPreview.length > 0
                                ? `Avail this offer to get a FREE gift (${availableOffer.freeItemsPreview.map((f: any) => f.productName).join(", ")})!`
                                : availableOffer.description || "You qualify for a special promotional offer!"}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={handleAvailOffer}
                            disabled={offerLoading}
                            style={{
                              position: "relative",
                              top: "auto",
                              right: "auto",
                              background: "linear-gradient(135deg, #F05F22 0%, #ea580c 100%)",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 8,
                              padding: "8px 18px",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: offerLoading ? "not-allowed" : "pointer",
                              opacity: offerLoading ? 0.7 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {offerLoading ? (
                              <>
                                <i className="fas fa-spinner fa-spin" /> Applying...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-gift" /> Avail Offer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Applied Offer Banner with Remove Option */}
                    {isOfferAvailed && appliedOffers.length > 0 && (
                      <div
                        style={{
                          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                          border: "1.5px solid #86efac",
                          borderRadius: 12,
                          padding: "12px 14px",
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                            <i className="fas fa-check-circle" style={{ color: "#16a34a", fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <strong style={{ fontSize: 13, color: "#15803d" }}>
                                  {appliedOffers[0].offerTitle}
                                </strong>
                                <span style={{ fontSize: 10, fontWeight: 700, background: "#16a34a", color: "#fff", padding: "1px 6px", borderRadius: 6 }}>
                                  Applied
                                </span>
                              </div>
                              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#166534" }}>
                                {appliedOffers[0].discountAmount > 0
                                  ? `You save ${formatCurrency(appliedOffers[0].discountAmount)} with this offer!`
                                  : freeItems.length > 0
                                  ? "🎁 Free gift included in your order!"
                                  : "Offer applied successfully!"}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveOffer}
                            disabled={offerLoading}
                            style={{
                              position: "relative",
                              top: "auto",
                              right: "auto",
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "1px solid #fca5a5",
                              borderRadius: 8,
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: offerLoading ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                            }}
                            title="Remove this offer"
                          >
                            {offerLoading ? (
                              <i className="fas fa-spinner fa-spin" />
                            ) : (
                              <>
                                <i className="fas fa-times" /> Remove Offer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {couponWarnings.length > 0 && couponWarnings.map((w, i) => (
                      <div key={i} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "#c2410c", display: "flex", gap: 8 }}>
                        <i className="fas fa-exclamation-triangle" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                        {w}
                      </div>
                    ))}

                    <h6 className="total-item">
                      Subtotal <span>{formatCurrency(summary.subtotal)}</span>
                    </h6>
                    {summary.offerDiscount > 0 && (
                      <h6 className="total-item" style={{ color: "#16a34a" }}>
                        Offer Discount <span>-{formatCurrency(summary.offerDiscount)}</span>
                      </h6>
                    )}
                    {summary.couponDiscount > 0 && (
                      <h6 className="total-item" style={{ color: "#16a34a" }}>
                        Coupon Discount <span>-{formatCurrency(summary.couponDiscount)}</span>
                      </h6>
                    )}
                    <h4>
                      Total <span>{formatCurrency(summary.total)}</span>
                    </h4>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        marginTop: "10px",
                        fontStyle: "italic",
                      }}
                    >
                      Shipping charges calculated at checkout
                    </p>

                    {/* Coupon input — only shown to logged-in users */}
                    {isLoggedInUser() && (
                      <div style={{ marginTop: 18, borderTop: "1px solid #eee", paddingTop: 16 }}>
                        <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 13, color: "#374151" }}>
                          Have a coupon?
                        </p>

                        {appliedCoupon ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px" }}>
                            <i className="fas fa-ticket-alt" style={{ color: "#16a34a" }} aria-hidden="true" />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#15803d" }}>{appliedCoupon.code}</span>
                            <button
                              onClick={handleRemoveCoupon}
                              disabled={couponLoading}
                              style={{ position: "relative", top: "auto", right: "auto", background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                              aria-label="Remove coupon"
                            >
                              Remove
                            </button>
                          </div>
                        ) : isOfferAvailed && appliedOffers.length > 0 ? (
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              Coupons cannot be combined with active promotional offers.
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveOffer}
                              disabled={offerLoading}
                              style={{ position: "relative", top: "auto", right: "auto", background: "none", border: "none", color: "#ea580c", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0, whiteSpace: "nowrap" }}
                            >
                              Remove offer to use coupon
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", gap: 8, alignItems: "stretch", marginTop: 8 }}>
                              <input
                                id="cart-coupon-input"
                                type="text"
                                value={couponInput}
                                onChange={(e) => {
                                  setCouponInput(e.target.value.toUpperCase());
                                  setCouponError("");
                                  setCouponSuccess("");
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                                placeholder="ENTER COUPON CODE"
                                style={{
                                  flex: 1,
                                  height: 44,
                                  background: "#ffffff",
                                  border: "1.5px solid #e2e8f0",
                                  borderRadius: 8,
                                  padding: "0 14px",
                                  fontSize: 13,
                                  fontFamily: "monospace",
                                  letterSpacing: "1px",
                                  textTransform: "uppercase",
                                  outline: "none",
                                  boxSizing: "border-box",
                                  color: "#1f2937",
                                }}
                                disabled={couponLoading}
                              />
                              <button
                                type="button"
                                onClick={handleApplyCoupon}
                                disabled={couponLoading || !couponInput.trim()}
                                style={{
                                  position: "relative",
                                  top: "auto",
                                  right: "auto",
                                  height: 44,
                                  padding: "0 22px",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 8,
                                  border: "none",
                                  background:
                                    couponLoading || !couponInput.trim()
                                      ? "#cbd5e1"
                                      : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                  color: "#ffffff",
                                  cursor:
                                    couponLoading || !couponInput.trim() ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxSizing: "border-box",
                                  boxShadow:
                                    couponLoading || !couponInput.trim()
                                      ? "none"
                                      : "0 2px 6px rgba(22, 163, 74, 0.25)",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {couponLoading ? "…" : "Apply"}
                              </button>
                            </div>
                            {couponError && (
                              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>
                                <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} aria-hidden="true" />{couponError}
                              </p>
                            )}
                            {couponSuccess && (
                              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#16a34a" }}>
                                <i className="fas fa-check-circle" style={{ marginRight: 4 }} aria-hidden="true" />{couponSuccess}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "40px",
                  padding: "28px 20px",
                  background: "#f6f6f6",
                  borderRadius: "16px",
                  border: "1px solid #eee",
                }}
              >
                <div
                  className="cart_summary_btn"
                  style={{
                    display: "flex",
                    gap: "20px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={handleProceedToCheckout}
                    className="common_btn"
                    style={{
                      width: "100%",
                      maxWidth: "300px",
                      textAlign: "center",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    Proceed to Checkout
                  </button>
                  <Link
                    href="/products"
                    className="common_btn continue_shopping"
                    style={{
                      width: "100%",
                      maxWidth: "300px",
                      textAlign: "center",
                    }}
                  >
                    Continue Shopping
                  </Link>
                </div>

                {/* Inline Guest Checkout Authentication Form */}
                {showGuestAuth && (
                  <div
                    ref={guestAuthRef}
                    style={{
                      maxWidth: "540px",
                      margin: "28px auto 8px",
                      background: "#ffffff",
                      borderRadius: "16px",
                      padding: "26px 22px",
                      boxShadow: "0 10px 25px rgba(240, 95, 34, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)",
                      border: "1.5px solid #F05F22",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: "#1f2937", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#F05F22" }}><i className="fas fa-user-check" /></span>
                          {guestOtpStep === "details" ? "Contact Details for Checkout" : "Verify Mobile Number"}
                        </h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                          {guestOtpStep === "details"
                            ? "Please enter your details to create an account and checkout."
                            : `Enter the 6-digit verification code sent to +91 ${guestPhone}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuestAuth(false);
                          setGuestOtpStep("details");
                          setGuestAuthError("");
                        }}
                        style={{
                          background: "#f3f4f6",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          cursor: "pointer",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                        }}
                        title="Close"
                      >
                        ✕
                      </button>
                    </div>

                    {guestAuthError && (
                      <div
                        style={{
                          padding: "10px 14px",
                          marginBottom: "14px",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "8px",
                          color: "#b91c1c",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <i className="fas fa-exclamation-circle" />
                        <span>{guestAuthError}</span>
                      </div>
                    )}

                    {guestDevOtp && guestOtpStep === "otp" && (
                      <div
                        style={{
                          padding: "8px 12px",
                          marginBottom: "14px",
                          backgroundColor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "8px",
                          color: "#1e40af",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <i className="fas fa-info-circle" />
                        <span>Dev OTP Code: <strong>{guestDevOtp}</strong></span>
                      </div>
                    )}

                    {guestOtpStep === "details" ? (
                      <form onSubmit={handleRequestGuestOtp}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          {/* Name input */}
                          <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                              Full Name <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <div style={{ position: "relative" }}>
                              <i
                                className="fas fa-user"
                                style={{
                                  position: "absolute",
                                  left: "14px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#9ca3af",
                                  fontSize: "13px",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="e.g. Rahul Sharma"
                                value={guestName}
                                onChange={(e) => {
                                  setGuestName(e.target.value);
                                  setGuestAuthError("");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 14px 10px 38px",
                                  border: "1.5px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#1f2937",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                                required
                              />
                            </div>
                          </div>

                          {/* Email input */}
                          <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                              Email Address <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <div style={{ position: "relative" }}>
                              <i
                                className="fas fa-envelope"
                                style={{
                                  position: "absolute",
                                  left: "14px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  color: "#9ca3af",
                                  fontSize: "13px",
                                }}
                              />
                              <input
                                type="email"
                                placeholder="e.g. rahul@example.com"
                                value={guestEmail}
                                onChange={(e) => {
                                  setGuestEmail(e.target.value);
                                  setGuestAuthError("");
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 14px 10px 38px",
                                  border: "1.5px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#1f2937",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                                required
                              />
                            </div>
                          </div>

                          {/* Phone input */}
                          <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                              Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <span
                                style={{
                                  padding: "10px 12px",
                                  background: "#f9fafb",
                                  border: "1.5px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#4b5563",
                                  display: "flex",
                                  alignItems: "center",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                +91
                              </span>
                              <input
                                type="tel"
                                maxLength={10}
                                placeholder="10-digit mobile number"
                                value={guestPhone}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setGuestPhone(val);
                                  setGuestAuthError("");
                                }}
                                style={{
                                  flex: 1,
                                  padding: "10px 14px",
                                  border: "1.5px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  color: "#1f2937",
                                  outline: "none",
                                  letterSpacing: "1px",
                                  boxSizing: "border-box",
                                }}
                                required
                              />
                            </div>
                          </div>

                          {/* Terms checkbox */}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-start", gap: "8px", textAlign: "left", width: "100%", marginTop: "2px" }}>
                            <input
                              id="guest-terms-checkbox"
                              type="checkbox"
                              checked={guestAgree}
                              onChange={(e) => setGuestAgree(e.target.checked)}
                              style={{
                                width: "16px",
                                minWidth: "16px",
                                maxWidth: "16px",
                                height: "16px",
                                marginTop: "2px",
                                marginRight: "0px",
                                marginLeft: "0px",
                                accentColor: "#F05F22",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            />
                            <label
                              htmlFor="guest-terms-checkbox"
                              style={{
                                display: "inline",
                                fontSize: "12px",
                                color: "#6b7280",
                                cursor: "pointer",
                                margin: 0,
                                padding: 0,
                                textAlign: "left",
                                lineHeight: 1.4,
                              }}
                            >
                              I agree to the{" "}
                              <Link href="/terms-conditions" target="_blank" style={{ color: "#F05F22", textDecoration: "underline" }}>
                                Terms of Service
                              </Link>{" "}
                              &{" "}
                              <Link href="/privacy-policy" target="_blank" style={{ color: "#F05F22", textDecoration: "underline" }}>
                                Privacy Policy
                              </Link>
                            </label>
                          </div>

                          <button
                            type="submit"
                            disabled={guestAuthLoading}
                            className="common_btn"
                            style={{
                              width: "100%",
                              padding: "12px 20px",
                              fontSize: "15px",
                              fontWeight: 700,
                              borderRadius: "8px",
                              border: "none",
                              cursor: guestAuthLoading ? "not-allowed" : "pointer",
                              opacity: guestAuthLoading ? 0.7 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              marginTop: "4px",
                            }}
                          >
                            {guestAuthLoading ? (
                              <>
                                <i className="fas fa-spinner fa-spin" /> Sending OTP...
                              </>
                            ) : (
                              <>
                                Send OTP & Continue <i className="fas fa-arrow-right" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyGuestOtp}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                          <style>{`
                            .guest-otp-digit-input {
                              color: #111827 !important;
                              -webkit-text-fill-color: #111827 !important;
                              font-size: 22px !important;
                              font-weight: 700 !important;
                              background-color: #ffffff !important;
                              caret-color: #F05F22 !important;
                              width: 46px !important;
                              height: 52px !important;
                              padding: 0 !important;
                              margin: 0 !important;
                              box-sizing: border-box !important;
                              text-align: center !important;
                              line-height: 50px !important;
                              border: 2px solid #d1d5db !important;
                              border-radius: 10px !important;
                              outline: none !important;
                              display: inline-block !important;
                              vertical-align: middle !important;
                              transition: all 0.2s ease !important;
                            }
                            .guest-otp-digit-input:focus {
                              border-color: #F05F22 !important;
                              box-shadow: 0 0 0 3px rgba(240, 95, 34, 0.15) !important;
                              background-color: #fff8f5 !important;
                            }
                          `}</style>
                          {/* OTP 6 boxes */}
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "6px 0" }}>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <input
                                key={index}
                                ref={(el) => {
                                  otpInputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={1}
                                className="guest-otp-digit-input"
                                value={guestOtp[index]}
                                onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                onPaste={handleOtpPaste}
                                autoComplete="off"
                                style={{
                                  padding: "0px",
                                  margin: "0px",
                                  boxSizing: "border-box",
                                  textAlign: "center",
                                  fontSize: "22px",
                                  fontWeight: 700,
                                  color: "#111827",
                                  WebkitTextFillColor: "#111827",
                                  lineHeight: "50px",
                                }}
                              />
                            ))}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "13px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setGuestOtpStep("details");
                                setGuestAuthError("");
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#6b7280",
                                cursor: "pointer",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <i className="fas fa-edit" /> Edit details
                            </button>

                            {resendTimer > 0 ? (
                              <span style={{ color: "#9ca3af" }}>
                                Resend in <strong>{resendTimer}s</strong>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRequestGuestOtp()}
                                disabled={guestAuthLoading}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#F05F22",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={guestAuthLoading || guestOtp.join("").length !== 6}
                            className="common_btn"
                            style={{
                              width: "100%",
                              padding: "12px 20px",
                              fontSize: "15px",
                              fontWeight: 700,
                              borderRadius: "8px",
                              border: "none",
                              cursor: (guestAuthLoading || guestOtp.join("").length !== 6) ? "not-allowed" : "pointer",
                              opacity: (guestAuthLoading || guestOtp.join("").length !== 6) ? 0.6 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              marginTop: "4px",
                            }}
                          >
                            {guestAuthLoading ? (
                              <>
                                <i className="fas fa-spinner fa-spin" /> Verifying...
                              </>
                            ) : (
                              <>
                                Verify & Proceed to Checkout <i className="fas fa-check" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
