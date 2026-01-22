"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { calculateDiscountPercent } from "@/lib/product-utils";

interface Product {
    _id: string;
    name: string;
    title?: string;
    slug: string;
    price: number;
    discountPrice?: number;
    discountedPrice?: number;
    salePrice?: number;
    image: string;
    discount?: number;
    isRecentLaunch?: boolean;
    isCombo?: boolean;
}

interface Category {
    _id: string;
    name: string;
    slug: string;
    productCount?: number;
}

function ProductsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const categorySlug = searchParams?.get("category") || "";
    const searchQuery = searchParams?.get("search") || "";
    const priceRange = searchParams?.get("price") || "";

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [sort, setSort] = useState<string>("featured");
    const [isFetching, setIsFetching] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [allProductsCount, setAllProductsCount] = useState(0);
    const [activeCategory, setActiveCategory] = useState("");

    // Mobile filter modal state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [tempCategory, setTempCategory] = useState("");
    const [tempPriceRange, setTempPriceRange] = useState("");

    // Update active category when URL changes
    useEffect(() => {
        const newSlug = searchParams?.get("category") || "";
        setActiveCategory(newSlug);
        setTempCategory(newSlug);
        setTempPriceRange(searchParams?.get("price") || "");
    }, [searchParams]);

    // Compute total all products count from categories
    useEffect(() => {
        if (categories.length > 0) {
            const total = categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0);
            setAllProductsCount(total);
        }
    }, [categories]);

    useEffect(() => {
        // Fetch categories only once
        if (!initialLoadDone) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/categories`)
                .then((res) => res.json())
                .then((data) => {
                    const cats = data.data || [];
                    setCategories(cats);
                })
                .catch((err) => console.error("Error fetching categories:", err));
            setInitialLoadDone(true);
        }
    }, [initialLoadDone]);

    useEffect(() => {
        setPage(1);
        setProducts([]);
        setIsFetching(false);
        fetchProducts(1, true);
    }, [categorySlug, searchQuery, priceRange]);

    // Open filter modal with current values
    const openFilterModal = () => {
        setTempCategory(activeCategory);
        setTempPriceRange(priceRange);
        setShowFilterModal(true);
    };

    // Apply filters from modal
    const applyFilters = () => {
        const params = new URLSearchParams();
        if (tempCategory) params.set("category", tempCategory);
        if (tempPriceRange) params.set("price", tempPriceRange);
        if (searchQuery) params.set("search", searchQuery);
        
        const queryString = params.toString();
        router.push(`/products${queryString ? `?${queryString}` : ""}`);
        setShowFilterModal(false);
    };

    // Clear all filters
    const clearFilters = () => {
        setTempCategory("");
        setTempPriceRange("");
    };

    const fetchProducts = useCallback((pageNum: number, reset = false) => {
        if (isFetching) return; // Prevent multiple simultaneous fetches
        setLoading(true);
        setIsFetching(true);

        const offset = (pageNum - 1) * 12; // Convert page to offset
        let url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/products?offset=${offset}&limit=12`;

        if (categorySlug) {
            url += `&category=${categorySlug}`;
        }
        if (searchQuery) {
            url += `&search=${searchQuery}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                const newProducts = data.data || [];
                const total = data.pagination?.total || newProducts.length;

                if (reset) {
                    setProducts(newProducts);
                    setTotalCount(total);
                } else {
                    // Deduplicate by id
                    setProducts((prev) => {
                        const existingIds = new Set(prev.map((p: any) => p._id));
                        const filtered = newProducts.filter((p: any) => !existingIds.has(p._id));
                        return [...prev, ...filtered];
                    });
                }
                setHasMore(newProducts.length === 12);
                setLoading(false);
                setIsFetching(false);
            })
            .catch((err) => {
                console.error("Error fetching products:", err);
                setLoading(false);
                setIsFetching(false);
            });
    }, [isFetching, categorySlug, searchQuery]);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchProducts(nextPage, false);
    };

    const currentCategory = categories.find((cat) => cat.slug === categorySlug);

    // Price range options
    const priceRanges = [
        { value: "", label: "All Prices" },
        { value: "0-500", label: "Under ₹500" },
        { value: "500-1000", label: "₹500 - ₹1000" },
        { value: "1000-2000", label: "₹1000 - ₹2000" },
        { value: "2000-", label: "Above ₹2000" },
    ];

    // Filter sidebar content (reused in desktop and modal)
    const FilterContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <>
            <div className="sidebar_category">
                <h3>Categories</h3>
                <ul>
                    <li 
                        className={(!isMobile ? !activeCategory : !tempCategory) ? "current" : ""} 
                        style={{ color: (!isMobile ? !activeCategory : !tempCategory) ? "var(--primary)" : "inherit" }}
                    >
                        {isMobile ? (
                            <a 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); setTempCategory(""); }}
                                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            >
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {!tempCategory && <i className="fa-solid fa-check" style={{ color: "var(--primary)", fontSize: "12px" }}></i>}
                                    All Products
                                </span>
                                <span>({allProductsCount})</span>
                            </a>
                        ) : (
                            <Link href="/products">
                                <span>All Products</span>
                                <span>({allProductsCount})</span>
                            </Link>
                        )}
                    </li>
                    {categories.map((cat) => (
                        <li 
                            key={cat._id} 
                            className={(!isMobile ? cat.slug === activeCategory : cat.slug === tempCategory) ? "current" : ""} 
                            style={{ color: (!isMobile ? cat.slug === activeCategory : cat.slug === tempCategory) ? "var(--primary)" : "inherit" }}
                        >
                            {isMobile ? (
                                <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setTempCategory(cat.slug); }}
                                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                >
                                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {tempCategory === cat.slug && <i className="fa-solid fa-check" style={{ color: "var(--primary)", fontSize: "12px" }}></i>}
                                        {cat.name}
                                    </span>
                                    <span>({cat.productCount ?? 0})</span>
                                </a>
                            ) : (
                                <Link href={`/products?category=${cat.slug}${priceRange ? `&price=${priceRange}` : ""}`}>
                                    <span>{cat.name}</span>
                                    <span>({cat.productCount ?? 0})</span>
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="sidebar_category">
                <h3>Price Range</h3>
                <ul>
                    {priceRanges.map((range) => (
                        <li 
                            key={range.value || "all"} 
                            className={(!isMobile ? priceRange === range.value : tempPriceRange === range.value) ? "current" : ""} 
                            style={{ color: (!isMobile ? priceRange === range.value : tempPriceRange === range.value) ? "var(--primary)" : "inherit" }}
                        >
                            {isMobile ? (
                                <a 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setTempPriceRange(range.value); }}
                                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                >
                                    {tempPriceRange === range.value && <i className="fa-solid fa-check" style={{ color: "var(--primary)", fontSize: "12px" }}></i>}
                                    <span>{range.label}</span>
                                </a>
                            ) : (
                                <Link href={`/products${categorySlug ? `?category=${categorySlug}` : ""}${range.value ? `${categorySlug ? "&" : "?"}price=${range.value}` : ""}`}>
                                    <span>{range.label}</span>
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Filter Modal */}
            {showFilterModal && (
                <div 
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                    }}
                >
                    {/* Backdrop */}
                    <div 
                        onClick={() => setShowFilterModal(false)}
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.5)",
                        }}
                    />
                    {/* Modal Content */}
                    <div 
                        style={{
                            position: "relative",
                            background: "#fff",
                            width: "100%",
                            maxHeight: "80vh",
                            borderRadius: "20px 20px 0 0",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Modal Header */}
                        <div 
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "16px 20px",
                                borderBottom: "1px solid #eee",
                            }}
                        >
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 600 }}>Filters</h4>
                                {(tempCategory || tempPriceRange) && (
                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666" }}>
                                        {tempCategory && <span style={{ background: "#f0f0f0", padding: "2px 8px", borderRadius: "4px", marginRight: "6px" }}>{categories.find(c => c.slug === tempCategory)?.name || tempCategory}</span>}
                                        {tempPriceRange && <span style={{ background: "#f0f0f0", padding: "2px 8px", borderRadius: "4px" }}>{priceRanges.find(p => p.value === tempPriceRange)?.label || tempPriceRange}</span>}
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => setShowFilterModal(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    color: "#666",
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Scrollable Filter Content */}
                        <div 
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "20px",
                            }}
                        >
                            <FilterContent isMobile={true} />
                        </div>

                        {/* Modal Footer */}
                        <div 
                            style={{
                                display: "flex",
                                gap: "12px",
                                padding: "16px 20px",
                                borderTop: "1px solid #eee",
                                background: "#fff",
                            }}
                        >
                            <button 
                                onClick={clearFilters}
                                style={{
                                    flex: 1,
                                    padding: "14px",
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    background: "#fff",
                                    fontSize: "15px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                Clear All
                            </button>
                            <button 
                                onClick={applyFilters}
                                className="common_btn"
                                style={{
                                    flex: 2,
                                    padding: "14px",
                                    borderRadius: "8px",
                                    fontSize: "15px",
                                    fontWeight: 500,
                                }}
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="pt_55" style={{ paddingTop: "70px" }}>
            <div className="container">
                <div className="row">
                    {/* Sidebar - Hidden on mobile */}
                    <div className="col-lg-3 col-md-4 d-none d-md-block">
                        <FilterContent isMobile={false} />
                    </div>

                    {/* Products Grid */}
                    <div className="col-lg-9 col-md-8 col-12">
                        {/* Page Header */}
                        <div className="section_heading">
                            <h3>
                                {searchQuery
                                    ? `Search Results for "${searchQuery}"`
                                    : currentCategory
                                        ? currentCategory.name
                                        : "All Products"}
                            </h3>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                {/* Mobile Filter Button */}
                                <button 
                                    onClick={openFilterModal}
                                    className="d-flex d-md-none"
                                    style={{
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 12px",
                                        border: "1px solid #ddd",
                                        borderRadius: "6px",
                                        background: "#fff",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                    </svg>
                                    Filters
                                    {(categorySlug || priceRange) && (
                                        <span 
                                            style={{
                                                background: "var(--primary)",
                                                color: "#fff",
                                                borderRadius: "50%",
                                                width: "18px",
                                                height: "18px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "11px",
                                            }}
                                        >
                                            {(categorySlug ? 1 : 0) + (priceRange ? 1 : 0)}
                                        </span>
                                    )}
                                </button>
                                <label htmlFor="sort" className="d-none d-sm-inline" style={{ color: "#666", fontSize: 14 }}>Sort by:</label>
                                <select
                                    id="sort"
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    style={{
                                        border: "1px solid #ddd",
                                        borderRadius: 6,
                                        padding: "8px 10px",
                                        fontSize: 14,
                                        background: "white",
                                    }}
                                >
                                    <option value="featured">Featured</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                    <option value="newest">Newest</option>
                                </select>
                            </div>
                        </div>

                        {loading && page === 1 ? (
                            <div className="wd-load">
                                <p>Loading products...</p>
                            </div>
                        ) : (
                            <>
                                <div className="row">
                                    {products.length > 0 ? (
                                        [...products]
                                            .sort((a, b) => {
                                                const priceA = (a.discountPrice ?? a.discountedPrice ?? a.price);
                                                const priceB = (b.discountPrice ?? b.discountedPrice ?? b.price);
                                                if (sort === "price-asc") return priceA - priceB;
                                                if (sort === "price-desc") return priceB - priceA;
                                                if (sort === "newest") return (b as any)._id.localeCompare((a as any)._id);
                                                return 0;
                                            })
                                            .map((product) => {
                                                const basePrice = product.price ?? 0;
                                                const discounted = product.discountPrice ?? product.discountedPrice ?? product.salePrice;
                                                const hasDiscount = typeof discounted === "number" && discounted < basePrice && basePrice > 0;
                                                const discountPercent = hasDiscount ? calculateDiscountPercent(basePrice, discounted as number) : 0;
                                                const finalPrice = hasDiscount ? (discounted as number) : basePrice;
                                                const imageSrc = product.image?.startsWith('/') ? product.image : `/${product.image}`;

                                                return (
                                                    <div
                                                        key={product._id}
                                                        className="col-lg-4 col-md-6 col-sm-6 col-12"
                                                        style={{ marginBottom: "30px" }}
                                                    >
                                                        <div
                                                            className="gadget_product_item wow fadeInUp"
                                                            style={{
                                                                background: "linear-gradient(145deg, #ffffff 0%, #f7f9ff 100%)",
                                                                borderRadius: "18px",
                                                                padding: "14px",
                                                                boxShadow: "0 14px 34px rgba(0,0,0,0.08)",
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: "12px",
                                                                height: "100%",
                                                            }}
                                                        >
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                                                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                                    {product.isRecentLaunch && (
                                                                        <span style={{
                                                                            background: "#0f172a",
                                                                            color: "#fff",
                                                                            borderRadius: "999px",
                                                                            padding: "4px 10px",
                                                                            fontSize: "12px",
                                                                            letterSpacing: "0.4px",
                                                                            textTransform: "uppercase",
                                                                        }}>
                                                                            New Launch
                                                                        </span>
                                                                    )}
                                                                    {product.isCombo && (
                                                                        <span style={{
                                                                            background: "#0ea5e9",
                                                                            color: "#fff",
                                                                            borderRadius: "999px",
                                                                            padding: "4px 10px",
                                                                            fontSize: "12px",
                                                                            letterSpacing: "0.4px",
                                                                            textTransform: "uppercase",
                                                                        }}>
                                                                            Healthy Hamper
                                                                        </span>
                                                                    )}
                                                                    {hasDiscount && (
                                                                        <span style={{
                                                                            background: "#f97316",
                                                                            color: "#fff",
                                                                            borderRadius: "999px",
                                                                            padding: "4px 10px",
                                                                            fontSize: "12px",
                                                                            letterSpacing: "0.4px",
                                                                            textTransform: "uppercase",
                                                                        }}>
                                                                            {discountPercent}% Off
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="rating" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", color: "#0f172a" }}>
                                                                    <span style={{ fontWeight: 700 }}>0.0</span>
                                                                    <i className="fas fa-star" aria-hidden="true"></i>
                                                                    <span style={{ color: "#475569", fontSize: "12px" }}>(0 reviews)</span>
                                                                </p>
                                                            </div>

                                                            <Link href={`/products/${product.slug}`} style={{ display: "block", borderRadius: "12px", overflow: "hidden", background: "#f8fafc" }}>
                                                                <div className="img" style={{ position: "relative" }}>
                                                                    <Image
                                                                        src={imageSrc}
                                                                        alt={product.name || product.title || 'Product'}
                                                                        width={300}
                                                                        height={250}
                                                                        className="img-fluid w-100"
                                                                        style={{ objectFit: "cover", width: "100%", height: "220px" }}
                                                                    />
                                                                </div>
                                                            </Link>

                                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                                                                <div className="top_text" style={{ margin: 0 }}>
                                                                    <Link href={`/products/${product.slug}`} className="title" style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                                                                        {product.name || product.title}
                                                                    </Link>
                                                                </div>

                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                                                                    <div>
                                                                        {hasDiscount ? (
                                                                            <p className="price-on-sale price" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                                                                ₹{Math.round(finalPrice)} <del style={{ color: "#94a3b8", marginLeft: "6px", fontWeight: 500 }}>₹{Math.round(basePrice)}</del>
                                                                                <span style={{ color: "#f97316", marginLeft: "8px", fontWeight: 700 }}>{discountPercent}% Off</span>
                                                                            </p>
                                                                        ) : (
                                                                            <p className="price" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                                                                ₹{Math.round(finalPrice)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <Link
                                                                        href={`/products/${product.slug}`}
                                                                        style={{
                                                                            background: "#0f172a",
                                                                            color: "#fff",
                                                                            padding: "10px 14px",
                                                                            borderRadius: "12px",
                                                                            fontSize: "13px",
                                                                            fontWeight: 700,
                                                                            textTransform: "uppercase",
                                                                            letterSpacing: "0.4px",
                                                                        }}
                                                                    >
                                                                        View
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="col-12">
                                            <p
                                                style={{
                                                    textAlign: "center",
                                                    padding: "60px 0",
                                                    color: "var(--text-2)",
                                                    fontSize: "18px",
                                                }}
                                            >
                                                No products found
                                                {(categorySlug || searchQuery) && (
                                                    <>
                                                        {" "}
                                                        <Link href="/products" style={{ color: "var(--primary)" }}>
                                                            View all products
                                                        </Link>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Load More Button */}
                                {hasMore && products.length > 0 && (
                                    <div style={{ textAlign: "center", marginTop: "40px" }}>
                                        <button
                                            onClick={loadMore}
                                            disabled={loading}
                                            className="common_btn"
                                            style={{
                                                opacity: loading ? 0.6 : 1,
                                                cursor: loading ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            {loading ? "Loading..." : "Load More"}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section></>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProductsContent />
        </Suspense>
    );
}

