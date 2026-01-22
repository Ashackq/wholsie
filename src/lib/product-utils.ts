/**
 * Utility functions for product image handling across the application
 * Based on simplified schema: products collection
 */

export interface ProductImage {
    _id?: string;
    name?: string;
    // Image field - can be single field (legacy) or images array (schema)
    image?: string;
    images?: Array<{
        url?: string;
        isDefault?: boolean;
        position?: number;
    }> | Array<string | { url?: string; src?: string; image?: string }>;
    [key: string]: any;
}

/**
 * Resolves a product image path from the product object
 * Per schema: images should be array of {url, isDefault, position}
 * But also handles legacy single image field
 * 
 * @param product - Product object from cache or API
 * @returns Full path to product image, or default fallback image
 */
export const resolveProductImage = (product?: ProductImage | null): string => {
    if (!product) return "/assets/images/makhana.png";

    let imagePath: string | undefined;

    // Try images array first (schema-compliant)
    if (Array.isArray(product.images) && product.images.length > 0) {
        const primary = product.images[0];
        if (typeof primary === "string") {
            imagePath = primary;
        } else if (primary && typeof primary === "object") {
            // Schema format: {url, isDefault, position}
            imagePath = (primary as any).url || (primary as any).src || (primary as any).image;
        }
    }

    // Fall back to single image property (legacy)
    if (!imagePath && product.image && typeof product.image === "string") {
        imagePath = product.image;
    }

    if (!imagePath) return "/assets/images/makhana.png";

    // Handle absolute URLs
    if (typeof imagePath === "string") {
        if (imagePath.startsWith("http")) return imagePath;
        if (imagePath.startsWith("/")) return imagePath;
        // Relative path - prepend upload directory
        return `/assets/uploaded/item/${imagePath}`;
    }

    return "/assets/images/makhana.png";
};

/**
 * Gets the best available price from a product according to schema priority
 * Priority: basePrice > prices[0].price > discountedPrice > discountPrice > salePrice > price
 * 
 * @param product - Product object with price data
 * @returns Price as number, or 0 if not found
 */
export const resolveProductPrice = (product?: ProductImage | null): number => {
    if (!product) return 0;

    // Schema: basePrice is main price
    if ((product as any).basePrice) {
        return Number((product as any).basePrice) || 0;
    }

    // Schema: prices array with multiple options
    if (Array.isArray((product as any).prices) && (product as any).prices.length > 0) {
        const firstPrice = (product as any).prices[0].price;
        if (firstPrice) return Number(firstPrice) || 0;
    }

    // Legacy price fields (fallback chain)
    const legacyPrice =
        (product as any).discountedPrice ||
        (product as any).discountPrice ||
        (product as any).salePrice ||
        (product as any).price;

    return Number(legacyPrice) || 0;
};

/**
 * Gets discount price if available
 * Per schema: prices[].discountPrice or legacy discountPrice fields
 * 
 * @param product - Product object
 * @returns Discount price or 0
 */
export const resolveDiscountPrice = (product?: ProductImage | null): number => {
    if (!product) return 0;

    // Schema: prices array discount
    if (Array.isArray((product as any).prices) && (product as any).prices.length > 0) {
        const discountPrice = (product as any).prices[0].discountPrice;
        if (discountPrice) return Number(discountPrice) || 0;
    }

    // Legacy fields
    const discountPrice =
        (product as any).discountedPrice ||
        (product as any).discountPrice ||
        (product as any).salePrice;

    return Number(discountPrice) || 0;
};

/**
 * Checks if a product has a discount
 * @param product - Product object
 * @returns Boolean indicating if product is on sale
 */
export const hasProductDiscount = (product?: ProductImage | null): boolean => {
    if (!product) return false;
    const basePrice = resolveProductPrice(product);
    const salePrice = resolveDiscountPrice(product);
    return !!(salePrice && basePrice && salePrice < basePrice);
};

/**
 * Calculates discount percentage
 * @param basePrice - Original price
 * @param salePrice - Discounted price
 * @returns Discount percentage as integer
 */
export const calculateDiscountPercent = (basePrice: number, salePrice: number): number => {
    if (!basePrice || !salePrice || salePrice >= basePrice) return 0;
    return Math.round((1 - salePrice / basePrice) * 100);
};
