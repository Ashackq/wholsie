import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SEO Optimization Information | Wholesiii',
  description: 'Learn about SEO optimizations implemented on Wholesiii platform',
  robots: 'noindex, nofollow',
};

export default function SEOInfo() {
  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>SEO Optimization Implementation</h1>
      
      <p>This page provides information about SEO optimizations implemented on Wholesiii.</p>

      <h2>✅ Implemented Features</h2>
      
      <h3>1. XML Sitemap</h3>
      <p>
        A dynamic XML sitemap is available at <a href="/sitemap.xml">/sitemap.xml</a>
      </p>
      <p>Includes:</p>
      <ul>
        <li>All static pages (home, about, contact, policies, etc.)</li>
        <li>All products from the database</li>
        <li>All product categories</li>
        <li>Proper change frequency and priority settings</li>
        <li>Last modified timestamps</li>
      </ul>

      <h3>2. Robots.txt</h3>
      <p>
        Robots configuration available at <a href="/robots.txt">/robots.txt</a>
      </p>
      <p>Features:</p>
      <ul>
        <li>Allows search engine crawling of public pages</li>
        <li>Disallows crawling of admin, API, and private routes</li>
        <li>Specifies crawl delay and request rate</li>
        <li>Links to sitemap and RSS feed</li>
      </ul>

      <h3>3. RSS Feed</h3>
      <p>
        Latest products RSS feed available at <a href="/feed.xml">/feed.xml</a>
      </p>
      <p>Provides:</p>
      <ul>
        <li>Latest 50 products</li>
        <li>Product descriptions and prices</li>
        <li>Images and metadata</li>
        <li>Categories</li>
      </ul>

      <h3>4. Structured Data (Schema.org)</h3>
      <p>Implemented schemas:</p>
      <ul>
        <li>Organization schema with company information</li>
        <li>Product schema available for dynamic pages</li>
        <li>Breadcrumb schema for navigation</li>
        <li>FAQ schema for rich snippets</li>
      </ul>

      <h3>5. Meta Tags & Open Graph</h3>
      <ul>
        <li>Comprehensive title and description</li>
        <li>Open Graph tags for social media</li>
        <li>Twitter Card tags</li>
        <li>Canonical URLs</li>
        <li>Language alternates</li>
        <li>Mobile optimization tags</li>
      </ul>

      <h3>6. Performance Optimizations</h3>
      <ul>
        <li>Image optimization with WebP and AVIF support</li>
        <li>Gzip compression enabled</li>
        <li>Security headers (CSP, X-Frame-Options, etc.)</li>
        <li>DNS prefetch for external resources</li>
        <li>Cache control headers</li>
      </ul>

      <h2>🔍 How Search Engines Will Crawl</h2>
      <ol>
        <li>Google/Bing finds your robots.txt</li>
        <li>Follows link to sitemap.xml</li>
        <li>Crawls all pages listed in sitemap</li>
        <li>Indexes structured data</li>
        <li>Ranks pages based on content and signals</li>
      </ol>

      <h2>📊 Next Steps</h2>
      <ol>
        <li><strong>Submit to Google Search Console:</strong> <a href="https://search.google.com/search-console" target="_blank">https://search.google.com/search-console</a></li>
        <li><strong>Submit to Bing Webmaster Tools:</strong> <a href="https://www.bing.com/webmasters" target="_blank">https://www.bing.com/webmasters</a></li>
        <li><strong>Monitor Performance:</strong> Use Google PageSpeed Insights</li>
        <li><strong>Validate Markup:</strong> <a href="https://search.google.com/test/rich-results" target="_blank">Google Rich Results Test</a></li>
      </ol>

      <h2>📋 SEO Utilities Available</h2>
      <p>For developers integrating SEO on dynamic pages, use utilities from <code>src/lib/seo-utils.ts</code>:</p>
      <ul>
        <li><code>generateProductMetadata(slug, product)</code> - Product page metadata</li>
        <li><code>generateCategoryMetadata(slug, category)</code> - Category page metadata</li>
        <li><code>generateBreadcrumbSchema(items)</code> - Breadcrumb markup</li>
        <li><code>generateFAQSchema(faqs)</code> - FAQ rich snippets</li>
        <li><code>generateStaticParams(endpoint)</code> - ISR parameter generation</li>
      </ul>

      <h2>🔗 Quick Links</h2>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/sitemap.xml">XML Sitemap</a></li>
        <li><a href="/robots.txt">Robots.txt</a></li>
        <li><a href="/feed.xml">RSS Feed</a></li>
      </ul>

      <hr />
      <p style={{ fontSize: '12px', color: '#666' }}>
        SEO Optimization Information | Last Updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
