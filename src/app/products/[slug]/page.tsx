"use client";

import { useEffect, useState, use, useRef, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart, getCurrentUser } from "@/lib/api";
import { addToGuestCart, getGuestCart, clearGuestCart } from "@/lib/guest-cart";
import { useRouter } from "next/navigation";
import OfferBadge from "@/components/OfferBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface ProductImage {
    url: string;
    alt?: string;
}

interface ProductVariant {
    name: string;
    [key: string]: any;
}

interface Review {
    _id: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

interface Product {
    _id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    discountPrice?: number;
    stock: number;
    image: string;
    images?: ProductImage[];
    packetCount: number;
    minOrderQty: number;
    maxOrderQty?: number;
    taxPercentage: number;
    categoryId: any;
    category?: {
        _id: string;
        name: string;
    };
    weight?: number;
    variants?: ProductVariant[];
    ingredients?: string;
    specs?: {
        [key: string]: string;
    };
    reviews?: Review[];
    rating?: number;
    totalReviews?: number;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [product, setProduct] = useState<Product | null>(null);
    const router = useRouter();

    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');
    const [cartMessage, setCartMessage] = useState<string>("");

    // Review states
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewFormData, setReviewFormData] = useState({
        rating: 5,
        title: '',
        comment: ''
    });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [productOffers, setProductOffers] = useState<Array<{ title: string; badgeText?: string }>>([]);

    // ── Inline Auth Modal (Buy Now while logged out) ────────────────────────
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authStep, setAuthStep] = useState<"details" | "otp">("details");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authPhone, setAuthPhone] = useState("");
    const [authOtp, setAuthOtp] = useState<string[]>(["", "", "", "", "", ""]);
    const [authAgree, setAuthAgree] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const [authDevOtp, setAuthDevOtp] = useState("");
    const authModalRef = useRef<HTMLDivElement | null>(null);
    const authOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Check if user is logged in
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        setIsLoggedIn(!!token);
    }, []);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/products/slug/${slug}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.data) {
                    setProduct(data.data);
                    setQuantity(data.data.minOrderQty || 1);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching product:", err);
                setLoading(false);
            });
    }, [slug]);

    // Fetch reviews when product is loaded
    useEffect(() => {
        if (product?._id) {
            setReviewsLoading(true);
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/products/${product._id}/reviews`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.data)) {
                        setReviews(data.data);
                    }
                })
                .catch(err => console.error('Error fetching reviews:', err))
                .finally(() => setReviewsLoading(false));
        }
    }, [product?._id]);

    // Fetch active offers for this product
    useEffect(() => {
        if (product?._id) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/offers/products`)
                .then(res => res.json())
                .then(data => {
                    const items = data.data || [];
                    const matched = items.find((item: any) => item._id === product._id);
                    if (matched && matched.offers) {
                        setProductOffers(matched.offers);
                    }
                })
                .catch(() => {});
        }
    }, [product?._id]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !isLoggedIn) return;

        setReviewSubmitting(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/products/${product._id}/reviews`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        rating: reviewFormData.rating,
                        title: reviewFormData.title,
                        comment: reviewFormData.comment
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                alert('Review submitted successfully! It will be displayed after admin approval.');
                setReviewFormData({ rating: 5, title: '', comment: '' });
                setShowReviewForm(false);
                // Refresh reviews
                const reviewRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/products/${product._id}/reviews`
                );
                const reviewData = await reviewRes.json();
                if (reviewData.success) setReviews(reviewData.data);
            } else {
                alert(data.error || 'Failed to submit review');
            }
        } catch (err) {
            console.error('Error submitting review:', err);
            alert('Error submitting review');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleAddToCart = async () => {
        if (!product) return;

        try {
            const isLoggedInCart =
                typeof window !== "undefined" &&
                (!!localStorage.getItem("authToken") ||
                    !!localStorage.getItem("user"));
            if (!isLoggedInCart) {
                addToGuestCart({
                    productId: product._id,
                    quantity,
                    name: product.name,
                    price: product.discountPrice || product.price,
                    image: product.image,
                });
                setCartMessage(`✓ Added ${quantity} ${product.name} to cart!`);
                setTimeout(() => setCartMessage(""), 3000);
                return;
            }
            await addToCart(product._id, quantity);
            setCartMessage(`✓ Added ${quantity} ${product.name} to cart!`);
            setTimeout(() => setCartMessage(""), 3000);
        } catch (err: any) {
            setCartMessage(`✗ ${err?.message || "Failed to add to cart."}`);
            setTimeout(() => setCartMessage(""), 3000);
        }
    };

    const handleBuyNow = async () => {
        if (!product) return;

        // Check if logged in
        const userString = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (!userString) {
            // Add to guest cart so it merges after login
            addToGuestCart({
                productId: product._id,
                quantity,
                name: product.name,
                price: product.discountPrice || product.price,
                image: product.image,
            });
            // Show inline auth modal instead of redirecting to /login
            setShowAuthModal(true);
            setAuthStep("details");
            setAuthError("");
            setTimeout(() => authModalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
            return;
        }

        try {
            const user = JSON.parse(userString);
            const missingFields: string[] = [];
            if (!user.name || user.name.trim() === "" || user.name === "N/A" || /^user\d*$/i.test(user.name.trim())) missingFields.push("name");
            if (!user.email || user.email.trim() === "" || user.email === "N/A" || user.email.includes("phonenumber@")) missingFields.push("email");

            if (missingFields.length > 0) {
                localStorage.setItem("profileMessage", `Please complete your profile to proceed with checkout. Missing: ${missingFields.join(", ")}`);
                router.push("/complete-profile");
                return;
            }

            await addToCart(product._id, quantity);
            router.push("/checkout");
        } catch (err: any) {
            setCartMessage(`✗ ${err?.message || "Failed to process checkout."}`);
            setTimeout(() => setCartMessage(""), 3000);
        }
    };

    // ── Auth Modal Handlers ────────────────────────────────────────────────
    const handleAuthOtpDigit = (i: number, v: string) => {
        const c = v.replace(/[^0-9]/g, "").slice(-1);
        const arr = [...authOtp]; arr[i] = c;
        setAuthOtp(arr);
        if (c && i < 5) setTimeout(() => authOtpRefs.current[i + 1]?.focus(), 0);
    };
    const handleAuthOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !authOtp[i] && i > 0) authOtpRefs.current[i - 1]?.focus();
    };
    const handleAuthOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const p = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
        if (p) { setAuthOtp(p.split("").concat(Array(6 - p.length).fill(""))); setTimeout(() => authOtpRefs.current[Math.min(p.length, 5)]?.focus(), 0); }
    };

    const handleAuthRequestOtp = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!authName.trim()) { setAuthError("Please enter your full name."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.trim())) { setAuthError("Please enter a valid email address."); return; }
        const phone = authPhone.replace(/[^0-9]/g, "");
        if (!/^\d{10}$/.test(phone)) { setAuthError("Please enter a valid 10-digit mobile number."); return; }
        if (!authAgree) { setAuthError("Please agree to the Terms of Service & Privacy Policy."); return; }

        setAuthError(""); setAuthLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/request-otp`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, mode: "signup" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            if (data.otp) setAuthDevOtp(data.otp);
            setAuthOtp(["", "", "", "", "", ""]);
            setAuthStep("otp");
            setTimeout(() => authOtpRefs.current[0]?.focus(), 150);
        } catch (err: any) {
            setAuthError(err.message || "Failed to send OTP.");
        } finally { setAuthLoading(false); }
    };

    const handleAuthVerifyOtp = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        const fullOtp = authOtp.join("");
        if (fullOtp.length !== 6) { setAuthError("Please enter the complete 6-digit OTP."); return; }
        const phone = authPhone.replace(/[^0-9]/g, "");
        setAuthError(""); setAuthLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ phone, otp: fullOtp, name: authName.trim(), email: authEmail.trim(), rememberMe: true, mode: "signup" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invalid OTP");

            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.token) localStorage.setItem("authToken", data.token);

            // Merge guest cart
            const guestCart = getGuestCart();
            if (guestCart.items.length > 0) {
                await Promise.all(guestCart.items.map((item) => addToCart(item.productId, item.quantity, item.variantId)));
                clearGuestCart();
            }
            try {
                const profile = await getCurrentUser();
                const u = (profile as any)?.data || profile;
                if (u) localStorage.setItem("user", JSON.stringify(u));
            } catch { /* ignore */ }

            window.dispatchEvent(new Event("cart-updated"));
            router.push("/checkout");
        } catch (err: any) {
            setAuthError(err.message || "OTP verification failed.");
        } finally { setAuthLoading(false); }
    };

    if (loading) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '40px', marginBottom: '20px' }}></i>
                        <p>Loading product...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (!product) {
        return (
            <section className="mt_55 mb_100">
                <div className="container">
                    <h1>Product Not Found</h1>
                    <p>The product you're looking for doesn't exist.</p>
                    <Link href="/products" className="common_btn">
                        Back to Products
                    </Link>
                </div>
            </section>
        );
    }

    const finalPrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;
    const hasDiscount = product.discountPrice !== undefined && (product.discountPrice < product.price) && product.discountPrice > 0;


    const discountPercent = hasDiscount
        ? Math.round((1 - product.discountPrice! / product.price) * 100)
        : 0;
    const avgRating = product.rating || 0;
    const totalReviews = product.totalReviews || 0;

    // Build image list - use product.images if available, fallback to single image
    const imageList = (product.images && product.images.length > 0)
        ? [product.image, ...product.images]
        : [product.image];

    const highlightStyle = {
        // width: "100%",
        // maxHeight: "120px",
        // objectFit: "contain" as const,
        // margin: "12px 0",
        // borderRadius: "12px",
        // background: "#f8fafc",
        // padding: "10px",
    };


    return (
        <>
            {/* Page Banner */}
            <section className="page_banner" style={{ background: "url('/assets/images/bannerOther.jpg')", minHeight: 200 }}>

            </section>

            {/* Breadcrumb */}
            <section className="breadcrumb_part" style={{ paddingTop: "70px" }}>
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="breadcrumb_iner">
                                <h2>{product.name}</h2>
                                <div className="breadcrumb_link">
                                    <Link href="/">Home</Link>
                                    <span>/</span>
                                    <Link href="/products">Products</Link>
                                    {product.category && (
                                        <>
                                            <span>/</span>
                                            <Link href={`/products?category=${product.category._id}`}>
                                                {product.category.name}
                                            </Link>
                                        </>
                                    )}
                                    <span>/</span>
                                    <span>{product.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SHOP DETAILS SECTION */}
            <section className="shop_details mt_50 mb_100">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-10">
                            <div className="row">
                                {/* LEFT: Image Gallery */}
                                <div className="col-lg-6 col-md-10">
                                    <div className="shop_details_slider_area">
                                        <div className="row">
                                            {/* Thumbnail Navigation */}
                                            <div className="col-xl-2 col-lg-3 col-md-3 col-12 order-2 order-md-1" style={{ position: 'relative', zIndex: 2, paddingRight: '20px' }}>
                                                <div className="row details_slider_nav">
                                                    {imageList.map((img, idx) => (
                                                        <div className="col-12" key={idx}>
                                                            <div
                                                                className={`details_slider_nav_item ${selectedImage === idx ? 'active' : ''}`}
                                                                onClick={() => setSelectedImage(idx)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    border: selectedImage === idx ? '2px solid #333' : '1px solid #ddd',
                                                                    padding: '5px',
                                                                    borderRadius: '4px',
                                                                    background: '#fff'
                                                                }}
                                                            >
                                                                <Image
                                                                    src={`/${img}`}
                                                                    alt={product.name}
                                                                    width={100}
                                                                    height={100}
                                                                    className="img-fluid"
                                                                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Main Image Display */}
                                            <div className="col-xl-10 col-lg-9 col-md-9 order-1 order-md-2" style={{ position: 'relative', zIndex: 1 }}>
                                                <div className="details_slider_thumb">
                                                    <div
                                                        className="details_slider_thumb_item"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            minHeight: '400px',
                                                            backgroundColor: '#f8f8f8',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <Image
                                                            src={`/${imageList[selectedImage]}`}
                                                            alt={product.name}
                                                            width={600}
                                                            height={600}
                                                            className="img-fluid"
                                                            style={{
                                                                width: '100%',
                                                                height: 'auto',
                                                                maxHeight: '500px',
                                                                objectFit: 'contain'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Product Details */}
                                <div className="col-lg-6">
                                    <div className="shop_details_text">
                                        <h2 className="details_title">{product.name}</h2>

                                        {/* Stock & Rating */}
                                        <div className="d-flex flex-wrap align-items-center" style={{ gap: '20px', marginBottom: '20px' }}>
                                            <p className="stock">
                                                {product.stock > 0 ? (
                                                    <span style={{ color: 'green' }}>In Stock</span>
                                                ) : (
                                                    <span style={{ color: 'red' }}>Out of Stock</span>
                                                )}
                                            </p>
                                            <p className="rating">
                                                <i className="fas fa-star" style={{ color: '#ffa500' }}></i>
                                                <strong style={{ marginLeft: '5px' }}>{avgRating.toFixed(1)}</strong>
                                                <span style={{ marginLeft: '5px', color: '#666' }}>({totalReviews} reviews)</span>
                                            </p>
                                        </div>

                                        {/* Pricing */}
                                        <h3 className="price-on-sale price" style={{ marginBottom: '15px' }}>
                                            ₹{Math.round(finalPrice)}
                                            {hasDiscount && (
                                                <>
                                                    {' '}
                                                    <del style={{ color: '#999', marginLeft: '10px' }}>
                                                        ₹{Math.round(product.price)}
                                                    </del>
                                                    <span style={{ color: 'red', marginLeft: '10px', fontWeight: 'bold' }}>
                                                        {discountPercent}% Off
                                                    </span>
                                                </>
                                            )}
                                        </h3>

                                        {productOffers.length > 0 && (
                                            <div style={{ marginBottom: '14px' }}>
                                                <OfferBadge offers={productOffers} maxBadges={4} />
                                            </div>
                                        )}

                                        {product.weight !== undefined && product.weight !== null && (
                                            <p style={{ marginBottom: '12px', fontWeight: 600, color: '#111' }}>
                                                Weight: {product.weight} g
                                            </p>
                                        )}

                                        {/* Description */}
                                        <p className="short_description" style={{ marginBottom: '20px', lineHeight: '1.6' }}>
                                            {product.description}
                                        </p>

                                        {product.categoryId && product.categoryId.slug.includes("puff") && (
                                            <img
                                                className="highlight"
                                                src="/assets/images/puffhighlight.jpg"
                                                alt="Puff Highlight"
                                                loading="lazy"
                                                style={highlightStyle}
                                            />
                                        )}
                                        {product.categoryId && product.categoryId.slug === 'makhana' && (
                                            <img
                                                className="highlight"
                                                src="/assets/images/makhanahighlight.jpg"
                                                alt="Makhana Highlight"
                                                loading="lazy"
                                                style={highlightStyle}
                                            />
                                        )}
                                        {/* Variants Selection */}
                                        {product.variants && product.variants.length > 0 && (
                                            <div className="tf-product-info-variant-picker" style={{ marginBottom: '20px' }}>
                                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                                    Select Variant
                                                </label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {product.variants.map((variant, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedVariant(variant.name)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                border: selectedVariant === variant.name ? '2px solid #333' : '1px solid #ddd',
                                                                backgroundColor: selectedVariant === variant.name ? '#f0f0f0' : '#fff',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontWeight: selectedVariant === variant.name ? 'bold' : 'normal'
                                                            }}
                                                        >
                                                            {variant.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Quantity Selector & Action Buttons */}
                                        {(() => {
                                            const minQty = Math.max(1, Number(product.minOrderQty) || 1);
                                            const maxQty = Math.max(minQty, Number(product.maxOrderQty) || (typeof product.stock === 'number' && product.stock > 0 ? product.stock : 9999));
                                            const currentQty = Number.isFinite(quantity) && quantity >= minQty ? quantity : minQty;

                                            return (
                                                <div
                                                    className="d-flex flex-wrap align-items-center"
                                                    style={{ gap: '15px', marginBottom: '20px' }}
                                                >
                                                    <div className="details_qty_input wg-quantity">
                                                        <button
                                                            className="minus btn-quantity btn-decrease"
                                                            onClick={() => setQuantity(Math.max(minQty, currentQty - 1))}
                                                            disabled={currentQty <= minQty}
                                                            style={{
                                                                padding: '8px 12px',
                                                                border: '1px solid #ddd',
                                                                backgroundColor: '#f8f8f8',
                                                                cursor: currentQty <= minQty ? 'not-allowed' : 'pointer',
                                                                borderRadius: '4px'
                                                            }}
                                                        >
                                                            <i className="fal fa-minus"></i>
                                                        </button>
                                                        <input
                                                            type="text"
                                                            className="quantity-product"
                                                            value={currentQty}
                                                            onChange={(e) => {
                                                                const raw = e.target.value.trim();
                                                                if (raw === "") {
                                                                    setQuantity(minQty);
                                                                    return;
                                                                }
                                                                const parsed = parseInt(raw, 10);
                                                                if (isNaN(parsed)) {
                                                                    setQuantity(minQty);
                                                                    return;
                                                                }
                                                                setQuantity(Math.max(minQty, Math.min(maxQty, parsed)));
                                                            }}
                                                            style={{
                                                                width: '50px',
                                                                textAlign: 'center',
                                                                border: '1px solid #ddd',
                                                                padding: '8px',
                                                                borderRadius: '4px'
                                                            }}
                                                        />
                                                        <button
                                                            className="plus btn-quantity btn-increase"
                                                            onClick={() => setQuantity(Math.min(maxQty, currentQty + 1))}
                                                            disabled={currentQty >= maxQty}
                                                            style={{
                                                                padding: '8px 12px',
                                                                border: '1px solid #ddd',
                                                                backgroundColor: '#f8f8f8',
                                                                cursor: currentQty >= maxQty ? 'not-allowed' : 'pointer',
                                                                borderRadius: '4px'
                                                            }}
                                                        >
                                                            <i className="fal fa-plus"></i>
                                                        </button>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="details_btn_area" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                        <button
                                                            className="common_btn btn-buy-now"
                                                            onClick={handleBuyNow}
                                                            disabled={product.stock === 0}
                                                            style={{
                                                                opacity: product.stock === 0 ? 0.5 : 1,
                                                                cursor: product.stock === 0 ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            Buy Now <i className="fas fa-long-arrow-right"></i>
                                                        </button>
                                                        <button
                                                            className="common_btn btn-add-to-cart"
                                                            onClick={handleAddToCart}
                                                            disabled={product.stock === 0}
                                                            style={{
                                                                opacity: product.stock === 0 ? 0.5 : 1,
                                                                cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                                                                backgroundColor: '#6c757d'
                                                            }}
                                                        >
                                                            Add to cart <i className="fas fa-long-arrow-right"></i>
                                                        </button>
                                                        <button
                                                            className="common_btn btn-continue-shopping"
                                                            onClick={() => router.push('/products')}
                                                            style={{
                                                                backgroundColor: 'transparent',
                                                                color: '#333',
                                                                border: '2px solid #333',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <i className="fas fa-long-arrow-left"></i> Continue Shopping
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Cart Message */}
                                        {cartMessage && (
                                            <p
                                                style={{
                                                    padding: '10px',
                                                    marginBottom: '20px',
                                                    borderRadius: '4px',
                                                    backgroundColor: cartMessage.startsWith('✓') ? '#d4edda' : '#f8d7da',
                                                    color: cartMessage.startsWith('✓') ? '#155724' : '#721c24',
                                                    border: `1px solid ${cartMessage.startsWith('✓') ? '#c3e6cb' : '#f5c6cb'}`
                                                }}
                                            >
                                                {cartMessage}
                                            </p>
                                        )}

                                        {/* Inline Auth Modal — shown when Buy Now clicked while logged out */}
                                        {showAuthModal && (
                                            <div ref={authModalRef} style={{
                                                maxWidth: '540px',
                                                margin: '24px auto 8px',
                                                background: '#ffffff',
                                                borderRadius: '16px',
                                                padding: '26px 22px',
                                                boxShadow: '0 10px 25px rgba(240, 95, 34, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
                                                border: '1.5px solid #F05F22',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ color: '#F05F22' }}><i className="fas fa-user-check" /></span>
                                                            {authStep === 'details' ? 'Contact Details for Checkout' : 'Verify Mobile Number'}
                                                        </h4>
                                                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                                            {authStep === 'details'
                                                                ? 'Please enter your details to create an account and checkout.'
                                                                : `Enter the 6-digit verification code sent to +91 ${authPhone.replace(/[^0-9]/g, '')}`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAuthModal(false);
                                                            setAuthStep('details');
                                                            setAuthError('');
                                                        }}
                                                        style={{
                                                            background: '#f3f4f6',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '28px',
                                                            height: '28px',
                                                            cursor: 'pointer',
                                                            color: '#6b7280',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '13px',
                                                        }}
                                                        title="Close"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                {authError && (
                                                    <div style={{
                                                        padding: '10px 14px',
                                                        marginBottom: '14px',
                                                        backgroundColor: '#fef2f2',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '8px',
                                                        color: '#b91c1c',
                                                        fontSize: '13px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                    }}>
                                                        <i className="fas fa-exclamation-circle" />
                                                        <span>{authError}</span>
                                                    </div>
                                                )}

                                                {authDevOtp && authStep === 'otp' && (
                                                    <div style={{
                                                        padding: '8px 12px',
                                                        marginBottom: '14px',
                                                        backgroundColor: '#eff6ff',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: '8px',
                                                        color: '#1e40af',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}>
                                                        <i className="fas fa-info-circle" />
                                                        <span>Dev OTP Code: <strong>{authDevOtp}</strong></span>
                                                    </div>
                                                )}

                                                {authStep === 'details' ? (
                                                    <form onSubmit={handleAuthRequestOtp}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                            {/* Name input with user icon */}
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                                                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                                                                </label>
                                                                <div style={{ position: 'relative' }}>
                                                                    <i
                                                                        className="fas fa-user"
                                                                        style={{
                                                                            position: 'absolute',
                                                                            left: '14px',
                                                                            top: '50%',
                                                                            transform: 'translateY(-50%)',
                                                                            color: '#9ca3af',
                                                                            fontSize: '13px',
                                                                        }}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="e.g. Rahul Sharma"
                                                                        value={authName}
                                                                        onChange={(e) => {
                                                                            setAuthName(e.target.value);
                                                                            setAuthError('');
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 14px 10px 38px',
                                                                            border: '1.5px solid #e5e7eb',
                                                                            borderRadius: '8px',
                                                                            fontSize: '14px',
                                                                            color: '#1f2937',
                                                                            outline: 'none',
                                                                            boxSizing: 'border-box',
                                                                        }}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Email input with envelope icon */}
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                                                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                                                                </label>
                                                                <div style={{ position: 'relative' }}>
                                                                    <i
                                                                        className="fas fa-envelope"
                                                                        style={{
                                                                            position: 'absolute',
                                                                            left: '14px',
                                                                            top: '50%',
                                                                            transform: 'translateY(-50%)',
                                                                            color: '#9ca3af',
                                                                            fontSize: '13px',
                                                                        }}
                                                                    />
                                                                    <input
                                                                        type="email"
                                                                        placeholder="e.g. rahul@example.com"
                                                                        value={authEmail}
                                                                        onChange={(e) => {
                                                                            setAuthEmail(e.target.value);
                                                                            setAuthError('');
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '10px 14px 10px 38px',
                                                                            border: '1.5px solid #e5e7eb',
                                                                            borderRadius: '8px',
                                                                            fontSize: '14px',
                                                                            color: '#1f2937',
                                                                            outline: 'none',
                                                                            boxSizing: 'border-box',
                                                                        }}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Mobile number input with +91 badge */}
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                                                    Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                                                                </label>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <span
                                                                        style={{
                                                                            padding: '10px 12px',
                                                                            background: '#f9fafb',
                                                                            border: '1.5px solid #e5e7eb',
                                                                            borderRadius: '8px',
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            color: '#4b5563',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        +91
                                                                    </span>
                                                                    <input
                                                                        type="tel"
                                                                        maxLength={10}
                                                                        placeholder="10-digit mobile number"
                                                                        value={authPhone}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                                            setAuthPhone(val);
                                                                            setAuthError('');
                                                                        }}
                                                                        style={{
                                                                            flex: 1,
                                                                            padding: '10px 14px',
                                                                            border: '1.5px solid #e5e7eb',
                                                                            borderRadius: '8px',
                                                                            fontSize: '14px',
                                                                            color: '#1f2937',
                                                                            outline: 'none',
                                                                            letterSpacing: '1px',
                                                                            boxSizing: 'border-box',
                                                                        }}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Terms checkbox */}
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '8px', textAlign: 'left', width: '100%', marginTop: '2px' }}>
                                                                <input
                                                                    id="product-auth-terms-checkbox"
                                                                    type="checkbox"
                                                                    checked={authAgree}
                                                                    onChange={(e) => setAuthAgree(e.target.checked)}
                                                                    style={{
                                                                        width: '16px',
                                                                        minWidth: '16px',
                                                                        maxWidth: '16px',
                                                                        height: '16px',
                                                                        marginTop: '2px',
                                                                        marginRight: '0px',
                                                                        marginLeft: '0px',
                                                                        padding: '0px',
                                                                        accentColor: '#F05F22',
                                                                        cursor: 'pointer',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor="product-auth-terms-checkbox"
                                                                    style={{
                                                                        display: 'inline',
                                                                        fontSize: '12px',
                                                                        color: '#6b7280',
                                                                        cursor: 'pointer',
                                                                        margin: 0,
                                                                        padding: 0,
                                                                        textAlign: 'left',
                                                                        lineHeight: 1.4,
                                                                    }}
                                                                >
                                                                    I agree to the{' '}
                                                                    <Link href="/terms-conditions" target="_blank" style={{ color: '#F05F22', textDecoration: 'underline' }}>
                                                                        Terms of Service
                                                                    </Link>{' '}
                                                                    &{' '}
                                                                    <Link href="/privacy-policy" target="_blank" style={{ color: '#F05F22', textDecoration: 'underline' }}>
                                                                        Privacy Policy
                                                                    </Link>
                                                                </label>
                                                            </div>

                                                            <button
                                                                type="submit"
                                                                disabled={authLoading}
                                                                className="common_btn"
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 20px',
                                                                    fontSize: '15px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    cursor: authLoading ? 'not-allowed' : 'pointer',
                                                                    opacity: authLoading ? 0.7 : 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '8px',
                                                                    marginTop: '4px',
                                                                }}
                                                            >
                                                                {authLoading ? (
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
                                                    <form onSubmit={handleAuthVerifyOtp}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                                                            {/* OTP 6 boxes */}
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '6px 0' }}>
                                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                                    <input
                                                                        key={index}
                                                                        ref={(el) => {
                                                                            authOtpRefs.current[index] = el;
                                                                        }}
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        maxLength={1}
                                                                        className="guest-otp-digit-input"
                                                                        value={authOtp[index]}
                                                                        onChange={(e) => handleAuthOtpDigit(index, e.target.value)}
                                                                        onKeyDown={(e) => handleAuthOtpKeyDown(index, e)}
                                                                        onPaste={handleAuthOtpPaste}
                                                                        autoComplete="off"
                                                                        style={{
                                                                            width: '46px',
                                                                            height: '52px',
                                                                            padding: '0px',
                                                                            margin: '0px',
                                                                            boxSizing: 'border-box',
                                                                            textAlign: 'center',
                                                                            fontSize: '22px',
                                                                            fontWeight: 700,
                                                                            color: '#111827',
                                                                            WebkitTextFillColor: '#111827',
                                                                            lineHeight: '50px',
                                                                            border: '2px solid #d1d5db',
                                                                            borderRadius: '10px',
                                                                            backgroundColor: '#ffffff',
                                                                            outline: 'none',
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '13px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setAuthStep('details');
                                                                        setAuthError('');
                                                                    }}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#6b7280',
                                                                        cursor: 'pointer',
                                                                        padding: 0,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                    }}
                                                                >
                                                                    <i className="fas fa-edit" /> Edit details
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAuthRequestOtp()}
                                                                    disabled={authLoading}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#F05F22',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        padding: 0,
                                                                    }}
                                                                >
                                                                    Resend OTP
                                                                </button>
                                                            </div>

                                                            <button
                                                                type="submit"
                                                                disabled={authLoading || authOtp.join('').length !== 6}
                                                                className="common_btn"
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 20px',
                                                                    fontSize: '15px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    cursor: (authLoading || authOtp.join('').length !== 6) ? 'not-allowed' : 'pointer',
                                                                    opacity: (authLoading || authOtp.join('').length !== 6) ? 0.6 : 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '8px',
                                                                }}
                                                            >
                                                                {authLoading ? (
                                                                    <>
                                                                        <i className="fas fa-spinner fa-spin" /> Verifying...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Verify & Proceed to Checkout <i className="fas fa-arrow-right" />
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Section: Additional Info & Reviews */}
                            <div className="row mt_90">
                                <div className="col-12">
                                    <div className="shop_details_des_area">
                                        {/* Tab Navigation */}
                                        <ul
                                            className="nav nav-pills"
                                            style={{
                                                display: 'flex',
                                                gap: '20px',
                                                borderBottom: '2px solid #f0f0f0',
                                                marginBottom: '30px'
                                            }}
                                        >
                                            <li>
                                                <button
                                                    className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('info')}
                                                    style={{
                                                        padding: '10px 20px',
                                                        border: 'none',
                                                        borderBottom: activeTab === 'info' ? '3px solid #F05F22' : '3px solid transparent',
                                                        backgroundColor: 'transparent',
                                                        color: activeTab === 'info' ? '#F05F22' : '#666',
                                                        cursor: 'pointer',
                                                        fontWeight: activeTab === 'info' ? '600' : 'normal',
                                                        fontSize: '15px'
                                                    }}
                                                >
                                                    Additional Information
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('reviews')}
                                                    style={{
                                                        padding: '10px 20px',
                                                        border: 'none',
                                                        borderBottom: activeTab === 'reviews' ? '3px solid #F05F22' : '3px solid transparent',
                                                        backgroundColor: 'transparent',
                                                        color: activeTab === 'reviews' ? '#F05F22' : '#666',
                                                        cursor: 'pointer',
                                                        fontWeight: activeTab === 'reviews' ? '600' : 'normal',
                                                        fontSize: '15px'
                                                    }}
                                                >
                                                    Reviews ({reviews.length})
                                                </button>
                                            </li>
                                        </ul>

                                        {/* Additional Info Tab */}
                                        {activeTab === 'info' && (
                                            <div className="shop_details_additional_info">
                                                <div className="table-responsive">
                                                    <table className="table table-striped" style={{ marginBottom: '40px' }}>
                                                        <tbody>
                                                            <tr>
                                                                <th style={{ width: '30%', fontWeight: 'bold' }}>Product Name</th>
                                                                <td>{product.name}</td>
                                                            </tr>
                                                            <tr>
                                                                <th style={{ width: '30%', fontWeight: 'bold' }}>Price</th>
                                                                <td>₹{Math.round(finalPrice)}</td>
                                                            </tr>
                                                            <tr>
                                                                <th style={{ width: '30%', fontWeight: 'bold' }}>Unit</th>
                                                                <td>{product.packetCount}</td>
                                                            </tr>
                                                            {product.weight !== undefined && product.weight !== null && (
                                                                <tr>
                                                                    <th style={{ width: '30%', fontWeight: 'bold' }}>Weight</th>
                                                                    <td>{product.weight} g</td>
                                                                </tr>
                                                            )}
                                                            <tr>
                                                                <th style={{ width: '30%', fontWeight: 'bold' }}>Stock</th>
                                                                <td>{product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}</td>
                                                            </tr>
                                                            {product.ingredients && product.ingredients !== " " && (
                                                                <tr>
                                                                    <th style={{ width: '30%', fontWeight: 'bold', verticalAlign: 'top', paddingTop: '12px' }}>Ingredients</th>
                                                                    <td>

                                                                        {product.ingredients.split(',').map((ingredient, idx) => (
                                                                            <div key={idx} style={{ marginBottom: '8px' }}>
                                                                                • {ingredient.trim()}
                                                                            </div>
                                                                        ))}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            {product.minOrderQty && (
                                                                <tr>
                                                                    <th style={{ width: '30%', fontWeight: 'bold' }}>Min Order Qty</th>
                                                                    <td>{product.minOrderQty}</td>
                                                                </tr>
                                                            )}
                                                            {product.maxOrderQty && (
                                                                <tr>
                                                                    <th style={{ width: '30%', fontWeight: 'bold' }}>Max Order Qty</th>
                                                                    <td>{product.maxOrderQty}</td>
                                                                </tr>
                                                            )}
                                                            {product.specs && Object.keys(product.specs).length > 0 && (
                                                                <>
                                                                    {Object.entries(product.specs).map(([key, value]) => (
                                                                        <tr key={key}>
                                                                            <th style={{ width: '30%', fontWeight: 'bold' }}>
                                                                                {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                                                            </th>
                                                                            <td>{String(value)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Reviews Tab */}
                                        {activeTab === 'reviews' && (
                                            <div className="shop_details_review">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                                    <h3>Customer Reviews ({reviews.length})</h3>
                                                    {isLoggedIn && (
                                                        <button
                                                            onClick={() => setShowReviewForm(!showReviewForm)}
                                                            style={{
                                                                padding: '10px 20px',
                                                                backgroundColor: '#F05F22',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {showReviewForm ? 'Cancel' : 'Write a Review'}
                                                        </button>
                                                    )}
                                                </div>

                                                {!isLoggedIn && (
                                                    <div style={{
                                                        backgroundColor: '#fef3c7',
                                                        padding: '15px',
                                                        borderRadius: '4px',
                                                        marginBottom: '20px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <p style={{ margin: 0 }}>
                                                            <Link href="/login" style={{ color: '#F05F22', textDecoration: 'underline' }}>
                                                                Sign in
                                                            </Link>
                                                            {' '}to write a review
                                                        </p>
                                                    </div>
                                                )}

                                                {showReviewForm && isLoggedIn && (
                                                    <form
                                                        onSubmit={handleSubmitReview}
                                                        style={{
                                                            backgroundColor: '#f9f9f9',
                                                            padding: '20px',
                                                            borderRadius: '4px',
                                                            marginBottom: '30px'
                                                        }}
                                                    >
                                                        <div style={{ marginBottom: '15px' }}>
                                                            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>
                                                                Rating
                                                            </label>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() => setReviewFormData({
                                                                            ...reviewFormData,
                                                                            rating: star
                                                                        })}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            fontSize: '32px',
                                                                            cursor: 'pointer',
                                                                            padding: '0',
                                                                            color: star <= reviewFormData.rating ? '#ffa500' : '#ddd',
                                                                            transition: 'color 0.2s',
                                                                            lineHeight: '1'
                                                                        }}
                                                                        title={`${star} star${star !== 1 ? 's' : ''}`}
                                                                    >
                                                                        ★
                                                                    </button>
                                                                ))}
                                                                <span style={{ marginLeft: '12px', fontWeight: '600', color: '#F05F22' }}>
                                                                    {reviewFormData.rating} / 5
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div style={{ marginBottom: '15px' }}>
                                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                                                Title
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={reviewFormData.title}
                                                                onChange={(e) => setReviewFormData({
                                                                    ...reviewFormData,
                                                                    title: e.target.value
                                                                })}
                                                                placeholder="e.g., Great product!"
                                                                required
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    border: '1px solid #ddd',
                                                                    borderRadius: '4px',
                                                                    boxSizing: 'border-box'
                                                                }}
                                                            />
                                                        </div>

                                                        <div style={{ marginBottom: '15px' }}>
                                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                                                Comment
                                                            </label>
                                                            <textarea
                                                                value={reviewFormData.comment}
                                                                onChange={(e) => setReviewFormData({
                                                                    ...reviewFormData,
                                                                    comment: e.target.value
                                                                })}
                                                                placeholder="Share your experience with this product..."
                                                                rows={4}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    border: '1px solid #ddd',
                                                                    borderRadius: '4px',
                                                                    boxSizing: 'border-box',
                                                                    fontFamily: 'inherit'
                                                                }}
                                                            />
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            disabled={reviewSubmitting}
                                                            style={{
                                                                padding: '10px 20px',
                                                                backgroundColor: '#F05F22',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: reviewSubmitting ? 'not-allowed' : 'pointer',
                                                                opacity: reviewSubmitting ? 0.6 : 1
                                                            }}
                                                        >
                                                            {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                                                        </button>
                                                    </form>
                                                )}

                                                {reviews && reviews.length > 0 ? (
                                                    <div className="single_review_list_area">
                                                        {reviews.map((review) => (
                                                            <div
                                                                key={review._id}
                                                                style={{
                                                                    paddingBottom: '20px',
                                                                    marginBottom: '20px',
                                                                    borderBottom: '1px solid #f0f0f0'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                                    <div>
                                                                        <strong>{review.userId?.name || 'Anonymous'}</strong>
                                                                        {review.title && (
                                                                            <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: '500' }}>
                                                                                {review.title}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <span style={{ color: '#ffa500' }}>
                                                                        {'★'.repeat(review.rating)}
                                                                        {'☆'.repeat(5 - review.rating)}
                                                                    </span>
                                                                </div>
                                                                <p style={{ color: '#999', fontSize: '12px', marginBottom: '10px' }}>
                                                                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </p>
                                                                <p style={{ lineHeight: '1.6' }}>{review.comment}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
                                                        No reviews yet. Be the first to review this product!
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
