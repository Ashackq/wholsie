import { NextRequest, NextResponse } from 'next/server';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    const response = await fetch(`${apiUrl}/products?limit=50`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    const products = Array.isArray(data) ? data : data.data || [];

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Wholesiii - Latest Products</title>
    <link>${baseUrl}</link>
    <description>Discover the latest healthy snacks and baked goods from Wholesiii</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>Wholesiii</title>
      <link>${baseUrl}</link>
    </image>
    ${products
        .slice(0, 50)
        .map(
          (product: any) => `
    <item>
      <title>${escapeXml(product.name || product.title)}</title>
      <link>${baseUrl}/products/${product.slug}</link>
      <guid isPermaLink="true">${baseUrl}/products/${product.slug}</guid>
      <pubDate>${new Date(product.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(product.description || 'Premium healthy snack')}</description>
      <content:encoded><![CDATA[
        <p>${escapeXml(product.description || 'Premium healthy snack')}</p>
        <p><strong>Price:</strong> ₹${product.price}</p>
        ${product.image ? `<img src="${product.image}" alt="${escapeXml(product.name)}" />` : ''}
      ]]></content:encoded>
      ${product.category ? `<category>${escapeXml(product.category)}</category>` : ''}
    </item>
    `
        )
        .join('')}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating feed', { status: 500 });
  }
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
