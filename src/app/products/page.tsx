"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useProductCache } from "@/context/ProductCacheContext";
import { resolveProductImage, calculateDiscountPercent } from "@/lib/product-utils";

interface Product {
    _id: string;
    name: string;
    title?: string;
    slug: string;
    price: number;
    discountPrice?: number;
    discountedPrice?: number;
    image: string;
    discount?: number;
}

interface Category {
    _id: string;
    name: string;
    slug: string;
    productCount?: number;
}

function ProductsContent() {
    const searchParams = useSearchParams();
    const categorySlug = searchParams?.get("category") || "";
    const searchQuery = searchParams?.get("search") || "";

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
    const { upsertProducts } = useProductCache();

    // Update active category when URL changes
    useEffect(() => {
        const newSlug = searchParams?.get("category") || "";
        setActiveCategory(newSlug);
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
    }, [categorySlug, searchQuery]);

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

                // Cache the batch for reuse (e.g., cart/detail pages)
                upsertProducts(newProducts as any);

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

    return (
        <><section className="pt_55">
            <div className="container">
                <div className="row">
                    {/* Sidebar */}
                    <div className="col-lg-3 col-md-4 col-12">
                        <div className="sidebar_category">
                            <h3>Categories</h3>
                            <ul>
                                <li className={!activeCategory ? "current" : ""} style={{ color: !activeCategory ? "var(--primary)" : "inherit" }}>
                                    <Link href="/products">
                                        <span>All Products</span>
                                        <span>({allProductsCount})</span>
                                    </Link>
                                </li>
                                {categories.map((cat) => (
                                    <li key={cat._id} className={cat.slug === activeCategory ? "current" : ""} style={{ color: cat.slug === activeCategory ? "var(--primary)" : "inherit" }}>
                                        <Link href={`/products?category=${cat.slug}`}>
                                            <span>{cat.name}</span>
                                            <span>({cat.productCount ?? 0})</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Price Filter Placeholder */}
                        <div className="sidebar_category">
                            <h3>Price Range</h3>
                            <ul>
                                <li>
                                    <Link href={`/products${categorySlug ? `?category=${categorySlug}` : ""}#price`}>
                                        <span>Under ₹500</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href={`/products${categorySlug ? `?category=${categorySlug}` : ""}#price`}>
                                        <span>₹500 - ₹1000</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href={`/products${categorySlug ? `?category=${categorySlug}` : ""}#price`}>
                                        <span>₹1000 - ₹2000</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href={`/products${categorySlug ? `?category=${categorySlug}` : ""}#price`}>
                                        <span>Above ₹2000</span>
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Products Grid */
                    }
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
                                <label htmlFor="sort" style={{ color: "#666", fontSize: 14 }}>Sort by:</label>
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
                                                const priceA = a.discountPrice || a.discountedPrice || a.price;
                                                const priceB = b.discountPrice || b.discountedPrice || b.price;
                                                if (sort === "price-asc") return priceA - priceB;
                                                if (sort === "price-desc") return priceB - priceA;
                                                if (sort === "newest") return (b as any)._id.localeCompare((a as any)._id);
                                                return 0;
                                            })
                                            .map((product) => {
                                                const basePrice = product.price;
                                                const discounted = product.discountPrice ?? product.discountedPrice;
                                                const hasDiscount = discounted && discounted < basePrice;
                                                const discountPercent = hasDiscount
                                                    ? calculateDiscountPercent(basePrice, discounted)
                                                    : 0;
                                                const imageSrc = resolveProductImage(product);

                                                return (
                                                    <div
                                                        key={product._id}
                                                        className="col-lg-4 col-md-6 col-sm-6 col-12"
                                                        style={{ marginBottom: "30px" }}
                                                    >
                                                        <div className="gadget_product_item wow fadeInUp">
                                                            <div className="top_text">
                                                                <Link href={`/products/${product.slug}`} className="title">
                                                                    {product.name || product.title}
                                                                </Link>
                                                            </div>
                                                            <Link href={`/products/${product.slug}`}>
                                                                <div className="img">
                                                                    <Image
                                                                        src={imageSrc}
                                                                        alt={product.name || product.title || 'Product'}
                                                                        width={300}
                                                                        height={250}
                                                                        className="img-fluid w-100"
                                                                        style={{ objectFit: "cover" }}
                                                                    />
                                                                </div>
                                                            </Link>
                                                            <div className="bottom_text">
                                                                <p className="rating">
                                                                    0.0 <i className="fas fa-star" aria-hidden="true"></i>
                                                                    <span>(0 reviews)</span>
                                                                </p>
                                                                {hasDiscount ? (
                                                                    <p className="price-on-sale price">
                                                                        ₹{Math.round(discounted!)} <del>₹{Math.round(basePrice)}</del>{' '}
                                                                        <span style={{ color: 'red' }}>
                                                                            <b>{discountPercent}% Off</b>
                                                                        </span>
                                                                    </p>
                                                                ) : (
                                                                    <p className="price">₹{Math.round(basePrice)}</p>
                                                                )}
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

