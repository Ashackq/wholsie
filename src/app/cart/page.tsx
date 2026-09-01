"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCart,
  removeFromCart,
  updateCartItem,
  getProduct as getProductDetail,
  applyCouponToCart,
  removeCouponFromCart,
} from "@/lib/api";
import { resolveProductImage, resolveProductPrice } from "@/lib/product-utils";
import {
  getGuestCart,
  removeGuestCartItem,
  updateGuestCartItem,
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
  const [appliedOffers, setAppliedOffers] = useState<Array<{ offerTitle: string; discountAmount: number; offerSlug?: string }>>([]);
  const [freeItems, setFreeItems] = useState<Array<{ productName: string; productImage?: string; quantity: number; isOutOfStock: boolean; unitPrice: number }>>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponWarnings, setCouponWarnings] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const handleProceedToCheckout = () => {
    // Per implementation plan §14: always navigate to /checkout.
    // If the user is not logged in, the checkout page shows an inline AuthModal.
    router.push("/checkout");
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
              const calcRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/cart/calculate`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items: guestItems }),
                }
              );
              const calcJson = await calcRes.json();
              if (mounted && calcJson.success && calcJson.data) {
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
          // Pull enriched fields from the server response (Phase 11)
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
              body: JSON.stringify({ items: guestItems }),
            }
          );
          const calcJson = await calcRes.json();
          if (calcJson.success && calcJson.data) {
            setOfferDiscount(calcJson.data.offerDiscount ?? 0);
            setAppliedOffers(calcJson.data.appliedOffers ?? []);
            setFreeItems(calcJson.data.freeItems ?? []);
            setCouponWarnings(calcJson.data.warnings ?? []);
          }
        } catch {
          // ignore
        }
      } else {
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
    const safeQuantity = Math.max(1, Number.isNaN(quantity) ? 1 : quantity);
    setUpdatingItemId(group.mergedIds[0]);

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
                                        updatingItemId === group.mergedIds[0]
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
                                        updatingItemId === group.mergedIds[0]
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
                                        updatingItemId === group.mergedIds[0]
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
                                      updatingItemId === group.mergedIds[0]
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
                  <div className="cart_page_summary">
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

                      {/* Free items from offer engine */}
                      {freeItems.map((fi: any, idx) => (
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

                    {/* Offer discount banner */}
                    {appliedOffers.length > 0 && (
                      <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                        <i className="fas fa-tag" style={{ color: "#16a34a", fontSize: 16 }} aria-hidden="true" />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#15803d" }}>
                            {appliedOffers[0].offerTitle}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>
                            {appliedOffers[0].discountAmount > 0
                              ? `You save ${formatCurrency(appliedOffers[0].discountAmount)}`
                              : freeItems.length > 0
                              ? "🎁 Free gift added to your cart!"
                              : "Offer applied successfully"}
                          </p>
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

                    {/* Coupon input — only shown to logged-in users; hidden if offer active */}
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
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                              aria-label="Remove coupon"
                            >
                              Remove
                            </button>
                          </div>
                        ) : appliedOffers.length > 0 ? (
                          <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", margin: 0 }}>
                            Coupons cannot be combined with active offers.
                          </p>
                        ) : (
                          <>
                            <div style={{ display: "flex", gap: 6 }}>
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
                                placeholder="Enter coupon code"
                                style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", outline: "none" }}
                                disabled={couponLoading}
                              />
                              <button
                                onClick={handleApplyCoupon}
                                disabled={couponLoading || !couponInput.trim()}
                                className="common_btn"
                                style={{ padding: "8px 14px", fontSize: 13, border: "none", cursor: couponLoading || !couponInput.trim() ? "not-allowed" : "pointer", opacity: couponLoading || !couponInput.trim() ? 0.6 : 1 }}
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
                  marginTop: "50px",
                  padding: "30px",
                  background: "#f6f6f6",
                  borderRadius: "12px",
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
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
