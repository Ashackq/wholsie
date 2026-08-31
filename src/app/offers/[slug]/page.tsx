import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 60; // ISR

// ── Types ─────────────────────────────────────────────────────────────────────
interface OfferRule {
    type: string;
    discountValue?: number;
    maxDiscountAmount?: number;
    buyQuantity?: number;
    getQuantity?: number;
    comboPrice?: number;
    minimumCartValue?: number;
    minimumCartDiscountType?: string;
}

interface Product {
    _id: string;
    name: string;
    slug: string;
    price: number;
    salePrice?: number;
    image?: string;
    images?: string[];
}

interface Category {
    _id: string;
    name: string;
    slug: string;
}

interface Offer {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    badgeText?: string;
    ctaText?: string;
    ctaUrl?: string;
    termsAndConditions?: string;
    metaTitle?: string;
    metaDescription?: string;
    rule: OfferRule;
    applicableProducts?: Product[];
    applicableCategories?: Category[];
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    priority?: number;
}

// ── Server data ───────────────────────────────────────────────────────────────
async function fetchOffer(slug: string): Promise<{ offer: Offer | null; isCurrentlyActive: boolean }> {
    try {
        const res = await fetch(`${API}/offers/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) return { offer: null, isCurrentlyActive: false };
        const json = await res.json();
        return { offer: json.data, isCurrentlyActive: json.meta?.isCurrentlyActive ?? false };
    } catch {
        return { offer: null, isCurrentlyActive: false };
    }
}

// ── Static params for SSG ─────────────────────────────────────────────────────
export async function generateStaticParams() {
    try {
        const res = await fetch(`${API}/offers`, { next: { revalidate: 300 } });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data || []).map((o: Offer) => ({ slug: o.slug }));
    } catch {
        return [];
    }
}

// ── SEO ───────────────────────────────────────────────────────────────────────
export async function generateMetadata({
    params,
}: {
    params: { slug: string };
}): Promise<Metadata> {
    const { offer, isCurrentlyActive } = await fetchOffer(params.slug);

    if (!offer) {
        return {
            title: "Offer Not Found",
            robots: { index: false, follow: false },
        };
    }

    const title = offer.metaTitle || `${offer.title} | Wholesiii`;
    const description =
        offer.metaDescription ||
        offer.description ||
        `Get amazing deals with ${offer.title} at Wholesiii. Shop healthy snacks with exclusive discounts.`;

    return {
        title,
        description,
        robots: isCurrentlyActive
            ? { index: true, follow: true }
            : { index: false, follow: true }, // expired: noindex
        openGraph: {
            title,
            description,
            url: `${SITE_URL}/offers/${offer.slug}`,
            siteName: "Wholesiii",
            type: "website",
            ...(offer.image ? { images: [{ url: offer.image, width: 1200, height: 630, alt: offer.title }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(offer.image ? { images: [offer.image] } : {}),
        },
        alternates: { canonical: `${SITE_URL}/offers/${offer.slug}` },
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ruleDescription(rule: OfferRule): string {
    switch (rule.type) {
        case "percentage_discount":
            return `${rule.discountValue}% off${rule.maxDiscountAmount ? ` (up to ₹${rule.maxDiscountAmount})` : ""}`;
        case "fixed_discount":
            return `₹${rule.discountValue} flat off`;
        case "buy_x_get_y_free":
            return `Buy ${rule.buyQuantity} get ${rule.getQuantity} free`;
        case "combo_discount":
            return `Combo deal at ₹${rule.comboPrice}`;
        case "minimum_cart_discount":
            return `${rule.discountValue}${rule.minimumCartDiscountType === "fixed" ? "₹" : "%"} off on orders above ₹${rule.minimumCartValue}`;
        case "free_shipping":
            return "Free shipping on your order";
        default:
            return rule.type.replace(/_/g, " ");
    }
}

function resolveImage(p: Product) {
    const img = p.image || p.images?.[0];
    if (!img) return "/assets/images/placeholder.svg";
    if (img.startsWith("/") || img.startsWith("http")) return img;
    return `/${img}`;
}

function fmtDate(d?: string) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

// ── Structured data (SpecialAnnouncement) ─────────────────────────────────────
function offerJsonLd(offer: Offer, isActive: boolean) {
    return {
        "@context": "https://schema.org",
        "@type": "SpecialAnnouncement",
        name: offer.title,
        text: offer.description || offer.title,
        url: `${SITE_URL}/offers/${offer.slug}`,
        category: "https://www.wikidata.org/wiki/Q8416",
        announcementLocation: {
            "@type": "LocalBusiness",
            name: "Wholesiii",
            url: SITE_URL,
        },
        ...(offer.startDate ? { datePosted: offer.startDate } : {}),
        ...(offer.endDate ? { expires: offer.endDate } : {}),
        ...(offer.image ? { image: offer.image } : {}),
    };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function OfferDetailPage({
    params,
}: {
    params: { slug: string };
}) {
    const { offer, isCurrentlyActive } = await fetchOffer(params.slug);

    if (!offer) notFound();

    const hasProducts = offer.applicableProducts && offer.applicableProducts.length > 0;
    const hasCategories = offer.applicableCategories && offer.applicableCategories.length > 0;

    return (
        <>
            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd(offer, isCurrentlyActive)) }}
            />

            {/* Banner */}
            <section
                className="page_banner"
                style={{ background: offer.image ? `url('${offer.image}')` : "url('/assets/images/bannerOther.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
                <div className="page_banner_overlay">
                    <div className="container">
                        <div className="page_banner_text">
                            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                                {offer.badgeText && (
                                    <span style={{ background: "#f59e0b", color: "#0f172a", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                                        {offer.badgeText}
                                    </span>
                                )}
                                {!isCurrentlyActive && (
                                    <span style={{ background: "#ef4444", color: "#fff", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                                        Expired
                                    </span>
                                )}
                            </div>
                            <h1>{offer.title}</h1>
                            {offer.description && <p>{offer.description}</p>}
                        </div>
                    </div>
                </div>
            </section>

            <section style={{ padding: "50px 0 80px", background: "#0f172a" }}>
                <div className="container">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr min(340px, 100%)", gap: 32, alignItems: "start" }}>

                        {/* Left — details */}
                        <div>
                            {/* Offer highlight card */}
                            <div style={{ background: "#1e293b", borderRadius: 16, padding: 28, marginBottom: 32, border: "1px solid #334155" }}>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
                                    <i className="fas fa-gift" style={{ marginRight: 10, color: "#f59e0b" }} />
                                    What You Get
                                </h2>
                                <p style={{ fontSize: 18, color: "#fbbf24", fontWeight: 600, marginBottom: 16 }}>
                                    {ruleDescription(offer.rule)}
                                </p>
                                {(offer.startDate || offer.endDate) && (
                                    <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#94a3b8" }}>
                                        {offer.startDate && <span><i className="fas fa-calendar-check" style={{ marginRight: 6, color: "#10b981" }} />From {fmtDate(offer.startDate)}</span>}
                                        {offer.endDate && <span><i className="fas fa-calendar-times" style={{ marginRight: 6, color: "#ef4444" }} />Valid till {fmtDate(offer.endDate)}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Eligible products */}
                            {hasProducts && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
                                        Eligible Products
                                    </h2>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
                                        {offer.applicableProducts!.map((product) => (
                                            <Link
                                                key={product._id}
                                                href={`/products/${product.slug}`}
                                                style={{ textDecoration: "none", display: "block" }}
                                            >
                                                <div style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden", border: "1px solid #334155", transition: "transform 0.2s" }}>
                                                    <div style={{ position: "relative", height: 140, background: "#0f172a" }}>
                                                        <Image
                                                            src={resolveImage(product)}
                                                            alt={product.name}
                                                            fill
                                                            style={{ objectFit: "cover" }}
                                                            sizes="200px"
                                                        />
                                                    </div>
                                                    <div style={{ padding: "10px 12px" }}>
                                                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4, lineHeight: 1.3 }}>{product.name}</p>
                                                        <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                                                            ₹{product.salePrice || product.price}
                                                            {product.salePrice && product.salePrice < product.price && (
                                                                <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b", textDecoration: "line-through" }}>₹{product.price}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Eligible categories */}
                            {hasCategories && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
                                        Eligible Categories
                                    </h2>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                        {offer.applicableCategories!.map((cat) => (
                                            <Link
                                                key={cat._id}
                                                href={`/products?category=${cat.slug}`}
                                                style={{
                                                    padding: "8px 20px", borderRadius: 30, fontWeight: 600, fontSize: 14,
                                                    background: "#334155", color: "#e2e8f0", textDecoration: "none",
                                                    border: "1px solid #475569", transition: "background 0.2s",
                                                }}
                                            >
                                                {cat.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No scope = cart-wide */}
                            {!hasProducts && !hasCategories && (
                                <div style={{ background: "#1e293b", borderRadius: 12, padding: "16px 20px", marginBottom: 32, border: "1px solid #334155", color: "#94a3b8", fontSize: 14 }}>
                                    <i className="fas fa-shopping-cart" style={{ marginRight: 8, color: "#f59e0b" }} />
                                    This offer applies to your entire cart — no minimum product selection needed.
                                </div>
                            )}

                            {/* Terms */}
                            {offer.termsAndConditions && (
                                <div style={{ background: "#1e293b", borderRadius: 12, padding: "20px 24px", border: "1px solid #334155" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>Terms & Conditions</h3>
                                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, whiteSpace: "pre-line" }}>{offer.termsAndConditions}</p>
                                </div>
                            )}
                        </div>

                        {/* Right — CTA sticky card */}
                        <div style={{ position: "sticky", top: 100 }}>
                            <div style={{ background: "#1e293b", borderRadius: 16, padding: 28, border: "2px solid #f59e0b" }}>
                                <div style={{ textAlign: "center", marginBottom: 20 }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
                                        {isCurrentlyActive ? "Offer Active!" : "Offer Expired"}
                                    </h2>
                                    <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                                        {isCurrentlyActive
                                            ? "Add eligible products to your cart — the discount is applied automatically at checkout."
                                            : "This offer has ended. Browse current offers for active deals."}
                                    </p>
                                </div>

                                {isCurrentlyActive ? (
                                    <Link
                                        href={offer.ctaUrl || (hasProducts ? `/products/${offer.applicableProducts![0]?.slug}` : "/products")}
                                        style={{
                                            display: "block", textAlign: "center", padding: "14px",
                                            background: "#f59e0b", color: "#0f172a", borderRadius: 10,
                                            fontWeight: 700, fontSize: 16, textDecoration: "none",
                                            marginBottom: 12,
                                        }}
                                    >
                                        {offer.ctaText || "Shop Now"} →
                                    </Link>
                                ) : (
                                    <Link
                                        href="/offers"
                                        style={{
                                            display: "block", textAlign: "center", padding: "14px",
                                            background: "#334155", color: "#e2e8f0", borderRadius: 10,
                                            fontWeight: 700, fontSize: 15, textDecoration: "none",
                                        }}
                                    >
                                        See Current Offers
                                    </Link>
                                )}

                                <Link
                                    href="/cart"
                                    style={{
                                        display: "block", textAlign: "center", padding: "12px",
                                        border: "1px solid #475569", color: "#94a3b8", borderRadius: 10,
                                        fontWeight: 600, fontSize: 14, textDecoration: "none",
                                    }}
                                >
                                    View Cart
                                </Link>

                                <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 14 }}>
                                    Discount applied automatically — no code needed
                                </p>
                            </div>

                            {/* Breadcrumb */}
                            <nav style={{ marginTop: 20, fontSize: 13, color: "#64748b" }}>
                                <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
                                {" › "}
                                <Link href="/offers" style={{ color: "#64748b", textDecoration: "none" }}>Offers</Link>
                                {" › "}
                                <span style={{ color: "#94a3b8" }}>{offer.title}</span>
                            </nav>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
