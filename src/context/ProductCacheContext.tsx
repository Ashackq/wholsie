"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// Match the schema: https://schema.md -> products collection
type ProductCacheEntry = {
    _id: string;

    // Product Info
    name?: string;
    description?: string;

    // Pricing
    basePrice?: number;
    prices?: Array<{
        price?: number;
        discountPrice?: number;
        sku?: string;
        stock?: number;
    }>;

    // Legacy price fields (for backwards compatibility)
    price?: number;
    discountPrice?: number;
    discountedPrice?: number;
    salePrice?: number;

    // Images - should be array of objects per schema
    images?: Array<{
        url?: string;
        isDefault?: boolean;
        position?: number;
    }> | Array<string | { url?: string; src?: string; image?: string }>;

    // Variants
    variants?: Array<{
        name?: string;
        value?: string;
        image?: string;
        price?: number;
        stock?: number;
    }>;

    // Classification
    categoryId?: string;
    subCategoryId?: string;
    category?: { _id?: string; name?: string };

    // Metadata
    unit?: string;
    tax?: number;
    minOrderQty?: number;
    maxOrderQty?: number;
    status?: "active" | "inactive";
    isFeatured?: boolean;

    // Seller
    sellerId?: string;

    // Timestamps
    createdAt?: Date | string;
    updatedAt?: Date | string;

    // Catch-all for any other fields
    [key: string]: any;
};

type ProductCacheContextValue = {
    products: Record<string, ProductCacheEntry>;
    getProduct: (id?: string | null) => ProductCacheEntry | undefined;
    upsertProduct: (product: ProductCacheEntry | null | undefined) => void;
    upsertProducts: (products: Array<ProductCacheEntry | null | undefined>) => void;
};

const ProductCacheContext = createContext<ProductCacheContextValue | null>(null);

export function ProductCacheProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Record<string, ProductCacheEntry>>({});

    const upsertProduct = useCallback((product: ProductCacheEntry | null | undefined) => {
        if (!product?._id) return;
        setProducts((prev) => {
            if (prev[product._id]) {
                return { ...prev, [product._id]: { ...prev[product._id], ...product } };
            }
            return { ...prev, [product._id]: product };
        });
    }, []);

    const upsertProducts = useCallback((list: Array<ProductCacheEntry | null | undefined>) => {
        if (!list || list.length === 0) return;
        setProducts((prev) => {
            const next = { ...prev } as Record<string, ProductCacheEntry>;
            list.forEach((item) => {
                if (!item?._id) return;
                next[item._id] = next[item._id] ? { ...next[item._id], ...item } : item;
            });
            return next;
        });
    }, []);

    const getProduct = useCallback((id?: string | null) => {
        if (!id) return undefined;
        return products[id];
    }, [products]);

    const value = useMemo(
        () => ({ products, getProduct, upsertProduct, upsertProducts }),
        [products, getProduct, upsertProduct, upsertProducts]
    );

    return (
        <ProductCacheContext.Provider value={value}>
            {children}
        </ProductCacheContext.Provider>
    );
}

export function useProductCache() {
    const ctx = useContext(ProductCacheContext);
    if (!ctx) {
        throw new Error("useProductCache must be used within ProductCacheProvider");
    }
    return ctx;
}
