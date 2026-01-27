"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCart, removeFromCart, updateCartItem, getProduct as getProductDetail } from "@/lib/api";
import { resolveProductImage, resolveProductPrice } from "@/lib/product-utils";

type CartProduct = {
    _id?: string;
    name?: string;
    category?: { name?: string };
    basePrice?: number;
    salePrice?: number;
    discountedPrice?: number;
    image?: string;
    images?: Array<string | { url?: string; src?: string; image?: string }>;
    variants?: Array<{ price?: number; label?: string; name?: string; option?: string }>;
    tax?: number;
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

// Merge duplicate items by productId + variantIndex
// Use fetched products for complete data
const groupCartItems = (items: CartItem[], fullProducts: Record<string, CartProduct>): GroupedItem[] => {
    const map = new Map<string, GroupedItem>();
    for (const item of items) {
        const key = `${item.productId}:${item.variantIndex ?? -1}`;

        // Get fetched product for complete details
        const fullProduct = fullProducts[item.productId] || item.product;

        // Use price from fetched product if available
        const unitPrice = fullProduct ? resolveProductPrice(fullProduct) : (item.price || 0);

        const existing = map.get(key);
        if (existing) {
            existing.quantity += item.quantity;
            existing.mergedIds.push(item._id);
            // Prefer fetched product over API data
            existing.product = fullProducts[item.productId] || existing.product || item.product;
            existing.name = existing.name || item.name || fullProduct?.name;
            // If unit price was 0 and we found a non-zero, update
            if (!existing.unitPrice && unitPrice) existing.unitPrice = unitPrice;
        } else {
            map.set(key, {
                key,
                mergedIds: [item._id],
                productId: item.productId,
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
    const [fullProducts, setFullProducts] = useState<Record<string, CartProduct>>({});

    const handleProceedToCheckout = () => {
        const userString = localStorage.getItem("user");
        if (!userString) {
            router.push("/login");
            return;
        }

        const user = JSON.parse(userString);
        const missingFields: string[] = [];

        // Check if name is valid (not default pattern like User1234)
        if (!user.name || user.name.trim() === "" || user.name === "N/A" || /^user\d*$/i.test(user.name.trim())) {
            missingFields.push("name");
        }

        // Check if email is valid (not default phonenumber@ pattern)
        if (!user.email || user.email.trim() === "" || user.email === "N/A" || user.email.includes("phonenumber@")) {
            missingFields.push("email");
        }

        // If missing fields, redirect to profile with message
        if (missingFields.length > 0) {
            localStorage.setItem("profileMessage", `Please complete your profile to proceed with checkout. Missing: ${missingFields.join(", ")}`);
            router.push("/profile");
            return;
        }

        // All good, proceed to checkout
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
        [fullProducts]
    );

    const attachProductDetails = useCallback((payload: any): CartResponse => {
        const items = (payload?.items ?? []).map((item: CartItem) => {
            const productId = (item.productId || (item.product as any)?._id || item._id)?.toString?.() ?? "";
            const fullProduct = fullProducts[productId];
            const mergedProduct = {
                ...(fullProduct || {}),
                ...(item.product || {}),
                _id: productId || (fullProduct as any)?._id,
            } as CartProduct;

            return { ...item, productId: productId || item.productId, product: mergedProduct } as CartItem;
        });

        return { ...(payload || {}), items } as CartResponse;
    }, [fullProducts]);

    useEffect(() => {
        let mounted = true;
        const fetchedProductIds = new Set<string>();

        const loadCart = async () => {
            try {
                const response = await getCart();
                const normalized = attachProductDetails((response as any).data || response);
                if (mounted) setCart(normalized);

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
        const response = await getCart();
        const normalized = attachProductDetails((response as any).data || response);
        setCart(normalized);
    };

    const groups = useMemo(() => groupCartItems(cart?.items ?? [], fullProducts), [cart, fullProducts]);

    const handleQuantityChangeGroup = async (group: GroupedItem, quantity: number) => {
        const safeQuantity = Math.max(1, Number.isNaN(quantity) ? 1 : quantity);
        setUpdatingItemId(group.mergedIds[0]);

        // Optimistic UI update
        setCart((prev) => {
            if (!prev) return prev;
            const items = (prev.items || []).map((it) => {
                if (group.mergedIds.includes(it._id)) {
                    // Keep the first id; others will be removed
                    if (it._id === group.mergedIds[0]) return { ...it, quantity: safeQuantity } as CartItem;
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
        setUpdatingItemId(group.mergedIds[0]);
        try {
            for (const id of group.mergedIds) {
                await removeFromCart(id);
            }
            await refreshCart();
        } catch (e: any) {
            setError("Failed to remove item(s).");
        } finally {
            setUpdatingItemId(null);
        }
    };

    const summary = useMemo(() => {
        const subtotal = groups.reduce((sum, g) => sum + g.unitPrice * g.quantity, 0);
        return { subtotal, total: subtotal };
    }, [groups]);

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
            <section className="page_banner" style={{ background: "url(/assets/images/bannerOther.jpg)" }}>
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
                            <p style={{ padding: "8px", width: "100%", color: "#2F3443", opacity: 0.5, fontWeight: 600, fontSize: "24px", fontFamily: "Poppins" }}>
                                Your Cart Is Empty
                            </p>
                            <div style={{ margin: "0 auto", maxWidth: 280 }}>
                                <Image src="/assets/images/emptycart.png" alt="Empty cart" width={260} height={200} style={{ width: "100%", height: "auto" }} />
                            </div>
                            <div className="checkout-cart-section-container" style={{ marginTop: 16 }}>
                                <div style={{ color: "#2F3443", opacity: 0.75, fontWeight: 600, fontSize: 18, fontFamily: "Poppins" }}>
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
                                                        const name = fullProduct?.name ?? group.name ?? "Product";
                                                        const categoryName = fullProduct?.category?.name;
                                                        const imageSrc = fullProduct?.image || "";

                                                        return (
                                                            <tr key={group.key}>
                                                                <td className="cart_page_details">
                                                                    <div className="row align-items-center g-3">
                                                                        <div className="col-md-4 cart_page_img">
                                                                            <div className="img">
                                                                                <Image
                                                                                    src={'/' + imageSrc}
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
                                                                            {categoryName && <span><b>Category:</b> {categoryName}</span>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="cart_page_price"><h3>{formatCurrency(price)}</h3></td>
                                                                <td className="cart_page_quantity">
                                                                    <div className="cart_quantity d-flex align-items-center" style={{ gap: 10 }}>
                                                                        <button
                                                                            className="btn-quantity remove-meal"
                                                                            onClick={() => handleQuantityChangeGroup(group, group.quantity - 1)}
                                                                            disabled={updatingItemId === group.mergedIds[0]}
                                                                            style={{ padding: "6px 10px", lineHeight: 1.2 }}
                                                                        >
                                                                            -
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            value={group.quantity}
                                                                            onChange={(e) => handleQuantityChangeGroup(group, parseInt(e.target.value, 10))}
                                                                            disabled={updatingItemId === group.mergedIds[0]}
                                                                            style={{ width: 64, textAlign: "center", padding: "6px" }}
                                                                        />
                                                                        <button
                                                                            className="btn-quantity btnincreaseadd-meal"
                                                                            onClick={() => handleQuantityChangeGroup(group, group.quantity + 1)}
                                                                            disabled={updatingItemId === group.mergedIds[0]}
                                                                            style={{ padding: "6px 10px", lineHeight: 1.2 }}
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="cart_page_total"><h3>{formatCurrency(lineTotal)}</h3></td>
                                                                <td className="cart_page_action">
                                                                    <button
                                                                        className="remove_btn"
                                                                        onClick={() => handleRemoveGroup(group)}
                                                                        disabled={updatingItemId === group.mergedIds[0]}
                                                                        style={{ background: "transparent", border: "none", color: "#777" }}
                                                                    >
                                                                        <i className="fa fa-trash" aria-hidden="true"></i> Remove
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
                                                const name = fullProduct?.name ?? group.name ?? "Product";
                                                return (
                                                    <li key={`summary-${group.key}`}>
                                                        <div className="img">
                                                            <Image
                                                                src={'/' + imageSrc}
                                                                alt={name}
                                                                width={60}
                                                                height={60}
                                                                className="img-fluid w-100"
                                                                style={{ objectFit: "cover" }}
                                                            />
                                                        </div>
                                                        <div className="text">
                                                            <a>{name}</a>
                                                            <p>{group.quantity} x {formatCurrency(price)}</p>
                                                        </div>
                                                        <h6>{formatCurrency(price * group.quantity)}</h6>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        <h6 className="total-item">Subtotal <span>{formatCurrency(summary.subtotal)}</span></h6>
                                        <h4>Total <span>{formatCurrency(summary.total)}</span></h4>
                                        <p style={{ fontSize: '13px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                                            Tax, shipping & platform fees calculated at checkout
                                        </p>
                                    </div>
                                </div>
                            </div>


                            <div style={{ marginTop: '50px', padding: '30px', background: '#f6f6f6', borderRadius: '12px' }}>
                                <div className="cart_summary_btn" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button onClick={handleProceedToCheckout} className="common_btn" style={{ width: "100%", maxWidth: "300px", textAlign: "center", cursor: "pointer", border: "none" }}>
                                        Proceed to Checkout
                                    </button>
                                    <Link href="/products" className="common_btn continue_shopping" style={{ width: "100%", maxWidth: "300px", textAlign: "center" }}>
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