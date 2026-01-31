import { NextRequest, NextResponse } from 'next/server';
import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// This generates the XML sitemap for search engines
export async function GET(request: NextRequest): Promise<NextResponse> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    const staticPages = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/products', changefreq: 'daily', priority: '0.9' },
        { url: '/about', changefreq: 'monthly', priority: '0.8' },
        { url: '/blog', changefreq: 'weekly', priority: '0.8' },
        { url: '/contact', changefreq: 'monthly', priority: '0.7' },
        { url: '/privacy-policy', changefreq: 'yearly', priority: '0.5' },
        { url: '/terms-conditions', changefreq: 'yearly', priority: '0.5' },
        { url: '/shipping-policy', changefreq: 'monthly', priority: '0.7' },
        { url: '/refund-policy', changefreq: 'yearly', priority: '0.6' },
        { url: '/sitemap', changefreq: 'monthly', priority: '0.5' },
    ];

    staticPages.forEach((page) => {
        sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Dynamic products and categories
    try {
        const [productsRes, categoriesRes] = await Promise.all([
            fetch(`${apiUrl}/products?limit=1000`, { next: { revalidate: 3600 } }),
            fetch(`${apiUrl}/categories`, { next: { revalidate: 3600 } }),
        ]);

        if (productsRes.ok) {
            const productsData = await productsRes.json();
            const products = Array.isArray(productsData) ? productsData : productsData.data || [];

            products.forEach((product: any) => {
                if (product.slug) {
                    sitemap += `
  <url>
    <loc>${baseUrl}/products/${product.slug}</loc>
    <lastmod>${new Date(product.updatedAt || product.createdAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
                }
            });
        }

        if (categoriesRes.ok) {
            const categoriesData = await categoriesRes.json();
            const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData.data || [];

            categories.forEach((category: any) => {
                if (category.slug) {
                    sitemap += `
  <url>
    <loc>${baseUrl}/products?category=${category.slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
                }
            });
        }
    } catch (error) {
        console.error('Error fetching dynamic content for sitemap:', error);
    }

    sitemap += `
</urlset>`;

    return new NextResponse(sitemap, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
