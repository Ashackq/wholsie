"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart } from "@/lib/api";
import { addToGuestCart } from "@/lib/guest-cart";
import { useRouter } from "next/navigation";

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
                localStorage.setItem("postLoginRedirect", "/cart");
                setCartMessage("✓ Saved to cart. Please login to continue.");
                setTimeout(() => setCartMessage(""), 3000);
                router.push("/login");
                return;
            }
            await addToCart(product._id, quantity);
            setCartMessage(`✓ Added ${quantity} ${product.name} to cart!`);
            setTimeout(() => setCartMessage(""), 3000);
        } catch (err) {
            setCartMessage("✗ Failed to add to cart. Please login first.");
            setTimeout(() => {
                setCartMessage("")
                router.push("/login");

            }, 3000);
        }
    };

    const handleBuyNow = async () => {
        if (!product) return;

        try {
            // Check user profile data before proceeding
            const userString = localStorage.getItem("user");
            if (!userString) {
                addToGuestCart({
                    productId: product._id,
                    quantity,
                    name: product.name,
                    price: product.discountPrice || product.price,
                    image: product.image,
                });
                localStorage.setItem("postLoginRedirect", "/complete-profile");
                setCartMessage("✗ Please login first.");
                setTimeout(() => {
                    setCartMessage("")
                    router.push("/login");

                }, 1000);
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

            // Redirect to profile if any required fields are missing
            if (missingFields.length > 0) {
                // Store the redirect message in localStorage
                localStorage.setItem("profileMessage", `Please complete your profile to proceed with checkout. Missing: ${missingFields.join(", ")}`);
                router.push("/complete-profile");
                return;
            }

            // Add to cart and wait for it to complete
            await addToCart(product._id, quantity);
            // Redirect to checkout immediately after cart is updated
            router.push("/checkout");
        } catch (err) {
            setCartMessage("✗ Failed to add to cart. Please login first.");
            setTimeout(() => setCartMessage(""), 3000);
        }
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

                                        {/* Quantity Selector */}
                                        <div
                                            className="d-flex flex-wrap align-items-center"
                                            style={{ gap: '15px', marginBottom: '20px' }}
                                        >
                                            <div className="details_qty_input wg-quantity">
                                                <button
                                                    className="minus btn-quantity btn-decrease"
                                                    onClick={() =>
                                                        setQuantity(Math.max(product.minOrderQty, quantity - 1))
                                                    }
                                                    disabled={quantity <= product.minOrderQty}
                                                    style={{
                                                        padding: '8px 12px',
                                                        border: '1px solid #ddd',
                                                        backgroundColor: '#f8f8f8',
                                                        cursor: quantity <= product.minOrderQty ? 'not-allowed' : 'pointer',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    <i className="fal fa-minus"></i>
                                                </button>
                                                <input
                                                    type="text"
                                                    className="quantity-product"
                                                    value={quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || product.minOrderQty;
                                                        const max = product.maxOrderQty || product.stock;
                                                        setQuantity(Math.max(product.minOrderQty, Math.min(max, val)));
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
                                                    onClick={() => {
                                                        const max = product.maxOrderQty || product.stock;
                                                        setQuantity(Math.min(max, quantity + 1));
                                                    }}
                                                    disabled={quantity >= (product.maxOrderQty || product.stock)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        border: '1px solid #ddd',
                                                        backgroundColor: '#f8f8f8',
                                                        cursor: quantity >= (product.maxOrderQty || product.stock) ? 'not-allowed' : 'pointer',
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
                                            </div>
                                        </div>

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
