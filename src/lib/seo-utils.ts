import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Generate metadata for product pages with Schema.org structured data
 */
export async function generateProductMetadata(
    slug: string,
    product: any
): Promise<Metadata> {
    const productUrl = `${siteUrl}/products/${slug}`;

    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name || product.title,
        description: product.description || 'Premium healthy snack from Wholesiii',
        image: product.image ? `${siteUrl}${product.image}` : `${siteUrl}/placeholder.jpg`,
        url: productUrl,
        sku: product.sku || slug,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'Wholesiii',
        },
        offers: {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: 'INR',
            price: product.price || product.salePrice || product.discountedPrice || 0,
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: 'Wholesiii',
            },
        },
        ...(product.rating && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                ratingCount: product.reviewCount || 0,
            },
        }),
    };

    return {
        title: `${product.name || product.title} | Wholesiii`,
        description:
            product.metaDescription ||
            `Buy ${product.name || product.title} online at Wholesiii. Premium healthy snacks with zero cholesterol and no artificial additives.`,
        keywords: product.keywords || `${product.name}, healthy snacks, baked snacks, Wholesiii`,
        openGraph: {
            title: product.name || product.title,
            description:
                product.metaDescription ||
                `Buy ${product.name || product.title} from Wholesiii - Premium healthy snacks`,
            url: productUrl,
            siteName: 'Wholesiii',
            images: product.image
                ? [
                    {
                        url: `${siteUrl}${product.image}`,
                        width: 1200,
                        height: 630,
                        alt: product.name || product.title,
                    },
                ]
                : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name || product.title,
            description:
                product.metaDescription ||
                `Buy ${product.name || product.title} from Wholesiii - Premium healthy snacks`,
            images: product.image ? [`${siteUrl}${product.image}`] : [],
        },
        alternates: {
            canonical: productUrl,
        },
    };
}

/**
 * Generate metadata for category pages
 */
export async function generateCategoryMetadata(
    slug: string,
    category: any
): Promise<Metadata> {
    const categoryUrl = `${siteUrl}/products?category=${slug}`;

    return {
        title: `${category.name} | Wholesiii - Healthy Snacks`,
        description:
            category.metaDescription ||
            `Shop premium ${category.name} from Wholesiii. Zero cholesterol, gluten-free options, and nutrient-rich baked snacks.`,
        keywords: category.keywords || `${category.name}, healthy snacks, Wholesiii`,
        openGraph: {
            title: category.name,
            description:
                category.metaDescription ||
                `Shop premium ${category.name} from Wholesiii - Healthy snacks & baked goods`,
            url: categoryUrl,
            siteName: 'Wholesiii',
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title: category.name,
            description:
                category.metaDescription ||
                `Shop premium ${category.name} from Wholesiii - Healthy snacks & baked goods`,
        },
        alternates: {
            canonical: categoryUrl,
        },
    };
}

/**
 * Generate breadcrumb schema for better SEO
 */
export function generateBreadcrumbSchema(
    items: Array<{ name: string; url: string }>
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${siteUrl}${item.url}`,
        })),
    };
}

/**
 * Generate FAQ schema for SEO
 */
export function generateFAQSchema(
    faqs: Array<{ question: string; answer: string }>
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}

/**
 * Fetch product data for SSG/ISR
 */
export async function fetchProductForMetadata(slug: string) {
    try {
        const response = await fetch(`${apiUrl}/products/${slug}`, {
            next: { revalidate: 3600 }, // Revalidate every hour
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error fetching product ${slug}:`, error);
        return null;
    }
}

/**
 * Fetch category data for SSG/ISR
 */
export async function fetchCategoryForMetadata(slug: string) {
    try {
        const response = await fetch(`${apiUrl}/categories/${slug}`, {
            next: { revalidate: 3600 },
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error fetching category ${slug}:`, error);
        return null;
    }
}

/**
 * Generate static params for dynamic routes (for better SEO)
 */
export async function generateStaticParams(endpoint: string) {
    try {
        const response = await fetch(`${apiUrl}/${endpoint}?limit=1000`, {
            next: { revalidate: 3600 },
        });

        if (!response.ok) return [];

        const data = await response.json();
        const items = Array.isArray(data) ? data : data.data || [];

        return items
            .filter((item: any) => item.slug)
            .map((item: any) => ({
                slug: item.slug,
            }));
    } catch (error) {
        console.error(`Error generating static params for ${endpoint}:`, error);
        return [];
    }
}
