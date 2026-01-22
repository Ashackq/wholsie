"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCart, createOrder, createPaymentOrder, updateCartItem, removeFromCart, getProduct } from "@/lib/api";
import AddressModals from "@/components/AddressModals";
import { resolveProductImage } from "@/lib/product-utils";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface CartItem {
    _id: string;
    productId: any;
    name: string;
    price?: number;
    quantity?: number;
    image?: string;
    stock?: number;
    instock?: string;
    product?: any;
    variantIndex?: number;
}

interface Address {
    _id?: string;
    id?: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    is_delivery?: string;
    isDefault?: boolean;
}

export default function CheckoutPage() {
    const router = useRouter();
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    const [cart, setCart] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [addressesLoaded, setAddressesLoaded] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [orderNotes, setOrderNotes] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [useWallet, setUseWallet] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("1");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showCreateAddressModal, setShowCreateAddressModal] = useState(false);

    // Order calculation states
    const [subtotal, setSubtotal] = useState(0);
    const [tax, setTax] = useState(0);
    const [shippingCharge, setShippingCharge] = useState(0);
    const [packagingCharges, setPackagingCharges] = useState(0);
    const [platformFee, setPlatformFee] = useState(0);
    const [groups, setGroups] = useState<GroupedItem[]>([]);

    const cacheUser = (u: any) => {
        if (!u) return;
        setUser(u);
    };

    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    // Validate user profile data on component mount
    useEffect(() => {
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

        // If missing fields or no addresses loaded yet, redirect to profile
        if (missingFields.length > 0) {
            localStorage.setItem("profileMessage", `Please complete your profile to proceed with checkout. Missing: ${missingFields.join(", ")}`);
            router.push("/profile");
            return;
        }

        // If addresses have finished loading and none exist, force profile/addresses
        if (addressesLoaded && (!addresses || addresses.length === 0)) {
            localStorage.setItem("profileMessage", "Please add a delivery address to continue to checkout.");
            router.push("/profile/addresses");
            return;
        }
    }, [router]);

    const resolvePrice = (item: CartItem) => {
        const variant = item.product?.variants?.[item.variantIndex ?? 0];
        const rawPrice = variant?.price
            ?? (item.product as any)?.discountedPrice
            ?? (item.product as any)?.discountPrice
            ?? (item.product as any)?.salePrice
            ?? (item.product as any)?.basePrice
            ?? (item.product as any)?.price
            ?? item.price
            ?? 0;
        return Number(rawPrice) || 0;
    };

    type GroupedItem = {
        key: string;
        mergedIds: string[];
        productId: string;
        variantIndex?: number;
        quantity: number;
        product?: any;
        name?: string;
        unitPrice: number;
    };

    const groupCartItems = async (items: CartItem[]): Promise<GroupedItem[]> => {
        const map = new Map<string, GroupedItem>();
        for (const item of items) {
            const pid = (item.productId?._id || item.productId || "").toString();

            // Fetch product data from API
            let product = item.product;
            if (pid && (!product || !product.name)) {
                try {
                    const response = await getProduct(pid);
                    product = response?.data || response || product;
                } catch (err) {
                    console.error(`Failed to fetch product ${pid}:`, err);
                }
            }

            const key = `${pid}:${item.variantIndex ?? -1}`;
            const unitPrice = resolvePrice(product);
            const existing = map.get(key);
            if (existing) {
                existing.quantity += item.quantity ?? 1;
                existing.mergedIds.push(item._id);
                existing.product = existing.product || product;
                existing.name = existing.name || item.name || product?.name;
                if (!existing.unitPrice && unitPrice) existing.unitPrice = unitPrice;
            } else {
                map.set(key, {
                    key,
                    mergedIds: [item._id],
                    productId: pid,
                    variantIndex: (item as any).variantIndex,
                    quantity: item.quantity ?? 1,
                    product: product,
                    name: item.name || product?.name,
                    unitPrice,
                });
            }
        }
        return Array.from(map.values());
    };

    useEffect(() => {
        // Load Razorpay script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        loadCheckoutData();

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const attachProductDetails = useCallback((payload: any) => {
        const items = (payload?.items ?? []).map((item: CartItem) => {
            const productId = (item.productId?._id || item.productId || item._id)?.toString?.() ?? "";
            const mergedProduct = {
                ...(item as any).product || {},
                _id: productId,
            };
            return { ...item, productId, product: mergedProduct } as CartItem;
        });
        return { ...(payload || {}), items };
    }, []);

    const loadCheckoutData = async () => {
        try {
            const res = await getCart();
            if (!res.data) throw new Error("Failed to load cart");

            const normalized = attachProductDetails(res.data);
            setCart(normalized);

            // Load user data from API or use mock data
            try {
                const userData = await fetch(`${API_BASE}/auth/me`, { credentials: "include" }).then(r => r.json()).catch(() => ({
                    name: "Guest User",
                    phone: "1234567890",
                    email: "guest@example.com"
                }));
                const resolvedUser = userData.data || userData;
                cacheUser(resolvedUser);
            } catch {
                cacheUser({
                    name: "Guest User",
                    phone: "1234567890",
                    email: "guest@example.com"
                });
            }

            // Load addresses from API
            try {
                const resAddr = await fetch(`${API_BASE}/addresses`, { credentials: "include" });
                const addrJson = await resAddr.json().catch(() => ({ data: [] }));
                const list = Array.isArray(addrJson?.data) ? addrJson.data : Array.isArray(addrJson) ? addrJson : [];
                setAddresses(list);
                if (list.length > 0) {
                    const defaultAddr = list.find((a: any) => a.isDefault || a.is_delivery === "y") || list[0];
                    setSelectedAddress(defaultAddr);
                }
            } catch {
                setAddresses([]);
            }

            // Load wallet balance from API or use mock - TODO: implement wallet endpoint
            setWalletBalance(0); // Wallet not implemented yet

            // Totals derived from grouped items via summary
        } catch (err) {
            setError("Failed to load checkout data");
        } finally {
            setAddressesLoaded(true);
        }
    };

    useEffect(() => {
        const fetchGroups = async () => {
            if (cart?.items) {
                const groupedItems = await groupCartItems(cart.items);
                setGroups(groupedItems);
            } else {
                setGroups([]);
            }
        };
        fetchGroups();
    }, [cart]);

    const summary = useMemo(() => {
        const subtotalCalc = groups.reduce((sum, g) => sum + (g.unitPrice || 0) * (g.quantity || 0), 0);
        const taxCalc = subtotalCalc * 0.05;
        const shippingCalc = subtotalCalc > 500 ? 0 : 50;
        const platformFeeCalc = subtotalCalc * 0.02;
        return { subtotal: subtotalCalc, tax: taxCalc, shipping: shippingCalc, platformFee: platformFeeCalc };
    }, [groups]);

    useEffect(() => {
        setSubtotal(summary.subtotal);
        setTax(summary.tax);
        setShippingCharge(summary.shipping);
        setPlatformFee(summary.platformFee);
    }, [summary.subtotal, summary.tax, summary.shipping, summary.platformFee]);

    const calculateTotal = () => {
        let total = subtotal + tax + shippingCharge + packagingCharges + platformFee;
        total = total - couponDiscount;

        if (useWallet && walletBalance > 0) {
            const walletDeduction = Math.min(walletBalance, total);
            total = total - walletDeduction;
        }

        return Math.max(0, total);
    };

    const calculateWalletDeduction = () => {
        if (!useWallet || walletBalance <= 0) return 0;
        const total = summary.subtotal + summary.tax + summary.shipping + packagingCharges + summary.platformFee - couponDiscount;
        return Math.min(walletBalance, total);
    };

    const handleQuantityChangeGroup = async (group: { mergedIds: string[] }, quantity: number) => {
        const safeQuantity = Math.max(1, Number.isNaN(quantity) ? 1 : quantity);
        try {
            await updateCartItem(group.mergedIds[0], safeQuantity);
            for (let i = 1; i < group.mergedIds.length; i++) {
                await removeFromCart(group.mergedIds[i]);
            }
            const res = await getCart();
            const normalized = attachProductDetails(res.data);
            setCart(normalized);
        } catch (err) {
            setError("Failed to update cart");
        }
    };


    const handleCreateAddress = async (newAddr: Address) => {
        try {
            const res = await fetch(`${API_BASE}/addresses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newAddr)
            });
            const data = await res.json().catch(() => ({}));
            const created = (data && (data.data || data)) || {};
            const addressWithId: Address = {
                ...newAddr,
                ...(created || {}),
                id: created.id || created._id || newAddr.id || Date.now().toString(),
            };
            let next = [...addresses, addressWithId];
            if (newAddr.isDefault) {
                next = next.map((a) => ({ ...a, isDefault: false }));
                addressWithId.isDefault = true;
                next = next.map((a) => (a.id === addressWithId.id || (a as any)._id === addressWithId.id ? addressWithId : a));
            }
            setAddresses(next);
            setSelectedAddress(newAddr.isDefault ? addressWithId : addressWithId);
            setShowCreateAddressModal(false);
        } catch (err) {
            setError("Failed to create address");
        }
    };
    const handleRemoveGroup = async (group: { mergedIds: string[] }) => {
        try {
            for (const id of group.mergedIds) {
                await removeFromCart(id);
            }
            const res = await getCart();
            const normalized = attachProductDetails(res.data);
            setCart(normalized);
        } catch (err) {
            setError("Failed to remove item");
        }
    };

    const applyCoupon = async () => {
        if (!couponCode.trim()) {
            setError("Please enter a coupon code");
            return;
        }

        try {
            // Validate coupon via API
            const res = await fetch("/api/coupon/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: couponCode.trim(),
                    subtotal: subtotal
                })
            });

            const data = await res.json();
            if (data.valid) {
                setError("");
                setCouponDiscount(data.discount || 0);
            } else {
                setError(data.message || "Invalid coupon code");
                setCouponDiscount(0);
            }
        } catch (err) {
            setError("Failed to validate coupon");
            setCouponDiscount(0);
        }
    };

    const handlePayment = async (orderId: string, razorpayOrderId: string, amount: number) => {
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: amount * 100,
            currency: "INR",
            name: "Wholesii",
            description: "Order Payment",
            order_id: razorpayOrderId,
            handler: async function (response: any) {
                try {
                    // Payment successful - clear cart and redirect to order page
                    console.log("Payment successful:", response);
                    // Clear cart after successful payment
                    try {
                        await fetch(`${API_BASE}/cart`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                    } catch (e) {
                        // Ignore cart clear errors, order is already created
                    }
                    // You can verify payment on backend here if needed
                    // await fetch(`${API_BASE}/payments/verify`, {
                    //     method: "POST",
                    //     headers: { "Content-Type": "application/json" },
                    //     body: JSON.stringify({
                    //         razorpay_order_id: response.razorpay_order_id,
                    //         razorpay_payment_id: response.razorpay_payment_id,
                    //         razorpay_signature: response.razorpay_signature,
                    //         orderId: orderId
                    //     })
                    // });
                    router.push(`/orders/${orderId}?payment=success`);
                } catch (err) {
                    console.error("Payment verification failed:", err);
                    router.push(`/orders/${orderId}?payment=pending`);
                }
            },
            prefill: {
                name: user?.name || "",
                email: user?.email || "",
                contact: user?.mobile || "",
            },
            theme: {
                color: "#F05F22",
            },
            modal: {
                ondismiss: function () {
                    setLoading(false);
                    setError("Payment cancelled. You can retry from the orders page.");
                },
            },
            notes: {
                orderId: orderId,
            },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response: any) {
            setLoading(false);
            setError(`Payment failed: ${response.error.description || 'Please try again'}`);
            console.error("Payment failed:", response.error);
        });
        razorpay.open();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userString = localStorage.getItem("user");
            if (!userString) {
                setError("Please login to continue.");
                setLoading(false);
                router.push("/login");
                return;
            }

            const user = JSON.parse(userString);
            const missingFields: string[] = [];

            if (!user.name || user.name.trim() === "" || user.name === "N/A" || /^user\d*$/i.test(user.name.trim())) {
                missingFields.push("name");
            }

            if (!user.email || user.email.trim() === "" || user.email === "N/A" || user.email.includes("phonenumber@")) {
                missingFields.push("email");
            }

            if (!selectedAddress) {
                missingFields.push("address");
            }

            if (missingFields.length > 0) {
                localStorage.setItem(
                    "profileMessage",
                    `Please complete your profile to proceed with checkout. Missing: ${missingFields.join(", ")}`
                );
                setError("Please complete your profile before checkout.");
                setLoading(false);
                // If address missing, go straight to address manager
                if (missingFields.includes("address")) {
                    router.push("/profile/addresses");
                } else {
                    router.push("/profile");
                }
                return;
            }

            if (!cart?.items?.length) {
                setError("Your cart is empty");
                setLoading(false);
                return;
            }

            if (!selectedAddress) {
                setError("Please select a delivery address");
                setLoading(false);
                return;
            }

            const total = calculateTotal();

            // Create order
            const orderRes = await createOrder({
                addressId: selectedAddress._id || selectedAddress.id || '',
                paymentMethod,
                couponCode: couponCode || undefined,
            });

            const orderId = orderRes.data?.orderId || orderRes.data?._id;
            if (!orderId) throw new Error("Failed to create order");

            if (paymentMethod === "1" && total > 0) {
                // Create Razorpay order with orderId (backend fetches amount from database)
                const paymentRes = await createPaymentOrder(orderId);
                const razorpayOrderId = paymentRes.order.id;
                handlePayment(orderId, razorpayOrderId, total);
            } else {
                // COD or wallet payment - clear cart and redirect
                try {
                    await fetch(`${API_BASE}/cart`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                } catch (e) {
                    // Ignore cart clear errors, order is already created
                }
                router.push(`/orders/${orderId}`);
            }
        } catch (err: any) {
            setError(err.message || "Checkout failed");
            setLoading(false);
        }
    };

    if (!cart) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
            </div>
        );
    }

    if (!cart.items || cart.items.length === 0) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', paddingBottom: '60px' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '48px', fontWeight: '600', color: '#333', marginBottom: '20px' }}>Your Cart Is Empty</p>
                    <p style={{ fontSize: '20px', color: '#666', marginBottom: '30px' }}>Add items and get them delivered with ease</p>
                    <a
                        href="/"
                        style={{ display: 'inline-block', padding: '12px 30px', backgroundColor: '#F05F22', color: 'white', fontWeight: '600', fontSize: '15px', borderRadius: '40px', textDecoration: 'none' }}
                    >
                        Go to Home
                    </a>
                </div>
            </div>
        );
    }

    const total = calculateTotal();
    const walletDeduction = calculateWalletDeduction();

    return (
        <main style={{ minHeight: '100vh' }}>
            <style>{`
                .page_banner {
                    background: url('/assets/images/banners.jpg') center/cover no-repeat;
                    padding: 50px 0 52px 0;
                }
                .page_banner_overlay {
                    background: rgba(7, 28, 31, 0.05);
                }
                .page_banner_text h1 {
                    color: white;
                    font-size: 54px;
                    font-weight: 500;
                    text-align: center;
                    text-transform: capitalize;
                }
                .checkout_page {
                    margin-top: 100px;
                    margin-bottom: 100px;
                }
                .checkout_header h3 {
                    font-size: 28px;
                    font-weight: 600;
                    text-transform: capitalize;
                    margin-bottom: 25px;
                }
                .checkout_header p {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    border: 1px dashed #ddd;
                    padding: 15px;
                    text-transform: capitalize;
                    background: rgba(255, 165, 0, 0.04);
                    border-radius: 6px;
                    margin-bottom: 15px;
                    font-size: 15px;
                }
                .checkout_header p svg {
                    width: 22px;
                    margin-right: 5px;
                    color: #F05F22;
                    flex-shrink: 0;
                }
                .checkout_header p b {
                    font-weight: 500;
                    color: #000;
                    margin-left: 5px;
                }
                .checkout_header p a {
                    color: #F05F22;
                    margin-left: 5px;
                    text-decoration: none;
                }
                .checkout_header p a:hover {
                    color: #db5d1f;
                }
                .cart_page_summary {
                    background: #f6f6f6;
                    padding: 35px;
                    border-radius: 12px;
                }
                .cart_page_summary h3 {
                    text-transform: capitalize;
                    font-size: 24px;
                    font-weight: 500;
                    margin-bottom: 20px;
                }
                .cart_page_summary ul {
                    background: white;
                    padding: 15px;
                    margin-bottom: 15px;
                    border-radius: 8px;
                    max-height: 400px;
                    overflow-y: auto;
                    list-style: none;
                }
                .cart_page_summary ul li {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 15px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .cart_page_summary ul li:last-child {
                    border: none;
                    margin: 0;
                    padding: 0;
                }
                .cart_page_summary ul li .img {
                    width: 60px;
                    height: 60px;
                    background: #f6f6f6;
                    border-radius: 6px;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .cart_page_summary ul li .img img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .cart_page_summary ul li .text {
                    flex: 1;
                    min-width: 150px;
                }
                .cart_page_summary ul li .text a {
                    font-size: 15px;
                    display: block;
                    margin-bottom: 5px;
                    color: #000;
                    text-decoration: none;
                }
                .cart_page_summary ul li .text p {
                    font-size: 13px;
                    color: #F05F22;
                    font-weight: 500;
                    margin: 0;
                }
                .cart_page_summary h6,
                .cart_page_summary h4 {
                    text-transform: capitalize;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 16px;
                    font-weight: 400;
                    margin-top: 10px;
                    margin-bottom: 0;
                }
                .cart_page_summary h4 {
                    font-size: 18px;
                    font-weight: 500;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                .coupon-section {
                    position: relative;
                    margin-top: 25px;
                    margin-bottom: 20px;
                }
                .coupon-section input {
                    width: 100%;
                    border: 1px solid #eee;
                    padding: 10px 15px;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-family: inherit;
                }
                .coupon-section button {
                    position: absolute;
                    top: 8px;
                    right: 5px;
                    background: #31A56D !important;
                    padding: 9.5px 25px;
                    border-radius: 6px;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                }
                .checkout_payment {
                    border: 1px solid #ddd;
                    padding: 35px;
                    margin-top: 25px;
                    border-radius: 12px;
                }
                .checkout_payment h3 {
                    text-transform: capitalize;
                    font-size: 24px;
                    font-weight: 500;
                    margin: 0 0 20px 0;
                }
                .checkout_payment .form-check {
                    margin-bottom: 10px;
                }
                .checkout_payment .form-check input {
                    margin-right: 8px;
                }
                .checkout_payment .form-check label {
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 400;
                    margin-bottom: 0;
                }
                .common_btn {
                    background: #F05F22;
                    padding: 12px 25px;
                    color: white;
                    text-transform: capitalize;
                    font-weight: 500;
                    font-size: 15px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                    z-index: 1;
                    transition: all 0.3s ease;
                    border-radius: 40px;
                    border: none;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .common_btn:hover {
                    background: #000;
                }
                .common_btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .wallet-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 15px;
                    padding: 15px 0;
                    border-top: 1px solid #eee;
                    border-bottom: 1px solid #eee;
                }
                .wallet-row-l {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: 0.4s;
                    border-radius: 24px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.4s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: #31A56D;
                }
                input:checked + .slider:before {
                    transform: translateX(20px);
                }
            `}</style>

            <section className="page_banner">
                <div className="page_banner_overlay">
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div className="page_banner_text">
                                <h1>Checkout</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Checkout Content */}
            <section className="checkout_page">
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="checkout-grid">
                            {/* Left Column - Shipping and Order Info */}
                            <div className="checkout-shipping">
                                {/* Shipping Information */}
                                <div className="checkout_header">
                                    <h3>Shipping Information</h3>
                                    <p>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                        account: <b>{user?.name}, {user?.mobile}</b> <button type="button" onClick={async () => { try { const { logout } = await import("@/lib/api"); await logout(); localStorage.removeItem("user"); localStorage.removeItem("authToken"); sessionStorage.clear(); window.location.assign("/"); } catch (e) { /* noop */ } }} style={{ background: 'none', border: 'none', color: '#F05F22', cursor: 'pointer', padding: 0 }}>(logout)</button>
                                    </p>
                                </div>

                                {/* Delivery Information */}
                                <div className="checkout_header">
                                    <h3>
                                        Delivery Information
                                        <span style={{ float: 'right' }}>
                                            {selectedAddress ? (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/profile/addresses')}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F05F22', padding: '0' }}
                                                    title="Edit Address"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/profile/addresses')}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F05F22', display: 'flex', alignItems: 'center', gap: '5px', padding: '0', fontSize: '14px', fontWeight: '500' }}
                                                    title="Add New Address"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                    Create New Address
                                                </button>
                                            )}
                                        </span>
                                    </h3>
                                    {selectedAddress ? (
                                        <p>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                            </svg>
                                            Address: <b>
                                                {selectedAddress.street && `${selectedAddress.street}, `}
                                                {selectedAddress.landmark && `${selectedAddress.landmark}, `}
                                                {selectedAddress.city && `${selectedAddress.city}, `}
                                                {selectedAddress.state && `${selectedAddress.state}, `}
                                                {selectedAddress.pincode}
                                            </b>
                                        </p>
                                    ) : (
                                        <p style={{ color: '#999', margin: '0' }}>Address not found</p>
                                    )}
                                </div>

                                {/* Order Notes */}
                                <div className="checkout_header" style={{ marginTop: '35px' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', color: '#333', fontWeight: '500', marginBottom: '10px' }}>Order notes (optional)</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Note"
                                            value={orderNotes}
                                            onChange={(e) => setOrderNotes(e.target.value)}
                                            style={{ width: '100%', padding: '10px 15px', border: '1px solid #eee', borderRadius: '6px', fontFamily: 'inherit', boxSizing: 'border-box', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Order Summary */}
                            <div className="checkout-summary">
                                <div className="cart_page_summary" style={{ position: 'sticky', top: '20px' }}>
                                    <h3>Product summary</h3>

                                    {/* Cart Items */}
                                    <ul>
                                        {groups.map((group) => {

                                            const price = group.unitPrice;
                                            const quantity = group.quantity;
                                            const imageSrc = group.product?.image || "";
                                            const name = group.product?.name || group.name || "Product";
                                            return (
                                                <li key={group.key}>
                                                    <a href="#" className="img" style={{ display: 'block' }}>
                                                        <Image
                                                            src={"/" + imageSrc}
                                                            alt={name}
                                                            width={60}
                                                            height={60}
                                                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                                                            priority={false}
                                                        />
                                                    </a>
                                                    <div className="text">
                                                        <a href="#" className="cart-title link" style={{ fontSize: '15px', color: '#000', textDecoration: 'none', display: 'block', marginBottom: '5px' }}>{name}</a>
                                                        <p className="cart-price price">{formatCurrency(price)}</p>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #eee', borderRadius: '6px' }}>

                                                            <input
                                                                type="text"
                                                                value={quantity}
                                                                readOnly
                                                                style={{ width: '64px', textAlign: 'center', background: 'none', border: 'none', fontWeight: '600', color: '#000', padding: '6px' }}
                                                            />

                                                        </div>
                                                        <span style={{ fontWeight: '600', color: '#000', minWidth: '80px', textAlign: 'right' }}>{formatCurrency(price * quantity)}</span>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveGroup(group)}
                                                            style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: '#db1215', marginLeft: '10px', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    {/* Coupon Code */}
                                    <div className="coupon-section">
                                        <input
                                            type="text"
                                            placeholder="Coupone Code"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                        />
                                        <button type="button" onClick={applyCoupon}>
                                            Apply
                                        </button>
                                    </div>

                                    {/* Order Summary */}
                                    <h6>
                                        <span>Subtotal</span>
                                        <div><span>{formatCurrency(summary.subtotal)}</span></div>
                                    </h6>
                                    <h6>
                                        <span>Tax</span>
                                        <div><span>{formatCurrency(summary.tax)}</span></div>
                                    </h6>
                                    <h6>
                                        <span>Shipping Charge</span>
                                        <div><span>{formatCurrency(summary.shipping)}</span></div>
                                    </h6>
                                    {couponDiscount > 0 && (
                                        <h6 style={{ color: '#31A56D' }}>
                                            <span>Coupon Discount</span>
                                            <div><span>- {formatCurrency(couponDiscount)}</span></div>
                                        </h6>
                                    )}
                                    {packagingCharges > 0 && (
                                        <h6>
                                            <span>Packaging Charges</span>
                                            <div><span>{formatCurrency(packagingCharges)}</span></div>
                                        </h6>
                                    )}
                                    {summary.platformFee > 0 && (
                                        <h6>
                                            <span>Platform fee</span>
                                            <div><span>{formatCurrency(summary.platformFee)}</span></div>
                                        </h6>
                                    )}
                                    <h4>
                                        <span>Grand Total</span>
                                        <div style={{ color: '#F05F22' }}><span>{formatCurrency(summary.subtotal + summary.tax + summary.shipping + packagingCharges + summary.platformFee - couponDiscount)}</span></div>
                                    </h4>

                                    {/* Wallet */}
                                    {walletBalance > 0 && (
                                        <div className="wallet-row">
                                            <div className="wallet-row-l">
                                                <span style={{ color: '#333', fontWeight: '500' }}>Wallets</span>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={useWallet}
                                                        onChange={(e) => setUseWallet(e.target.checked)}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                            <div style={{ fontWeight: '600', color: '#000' }}>{formatCurrency(walletBalance)}</div>
                                        </div>
                                    )}
                                    {walletDeduction > 0 && (
                                        <p style={{ fontSize: '12px', color: '#31A56D', marginTop: '5px', marginBottom: '0' }}>{formatCurrency(walletDeduction)} will be deducted from wallet</p>
                                    )}

                                    {/* Amount to Pay */}
                                    <h4 style={{ marginTop: '20px' }}>
                                        <span>Amount To Pay</span>
                                        <div style={{ color: '#F05F22' }}><span>{formatCurrency(total)}</span></div>
                                    </h4>

                                </div>
                            </div>
                        </div>

                        {/* Bottom Section - Payment Method and Place Order Button */}
                        <div style={{ marginTop: '40px', padding: '30px', background: '#f6f6f6', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: '#fff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e9e9e9' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 12px 0' }}>Payment Method</h3>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', margin: 0 }}>
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="payment_method"
                                            value="1"
                                            checked={paymentMethod === "1"}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            style={{ margin: 0 }}
                                        />
                                        <span>Direct Bank Transfer</span>
                                    </label>
                                </div>

                                {error && (
                                    <div style={{ margin: 0, padding: '12px 14px', background: '#ffe0e0', border: '1px solid #ff9999', color: '#cc0000', borderRadius: '8px', fontSize: '14px' }}>
                                        {error}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button
                                        type="submit"
                                        disabled={loading || !cart.items.length}
                                        className="common_btn"
                                        style={{ width: '100%', maxWidth: '400px', display: 'flex' }}
                                    >
                                        {loading ? "Processing..." : "Place order"}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '18px', height: '18px', transform: 'rotate(-45deg)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </section>

            {/* Address Modals */}
            <AddressModals
                showListModal={showAddressModal}
                setShowListModal={setShowAddressModal}
                addresses={addresses}
                selectedAddress={selectedAddress}
                onSelectAddress={setSelectedAddress}
            />
        </main>
    );
}
