import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 60; // ISR — refresh every 60 s

export const metadata: Metadata = {
    title: "Current Offers & Deals",
    description:
        "Browse all current promotional offers, combo deals, and exclusive discounts on Wholesiii healthy snacks. Limited-time deals updated regularly.",
    openGraph: {
        title: "Current Offers & Deals | Wholesiii",
        description:
            "Exclusive deals on healthy snacks — buy-1-get-1, percentage off, combo packs and more.",
        url: `${SITE_URL}/offers`,
        siteName: "Wholesiii",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Current Offers & Deals | Wholesiii",
        description: "Exclusive deals on healthy snacks — combo packs, percentage off, free items and more.",
    },
    alternates: { canonical: `${SITE_URL}/offers` },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Offer {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    badgeText?: string;
    ctaText?: string;
    rule: {
        type: string;
        discountValue?: number;
        minimumCartValue?: number;
        buyQuantity?: number;
        getQuantity?: number;
    };
    startDate?: string;
    endDate?: string;
    isActive: boolean;
}

// ── Server-side data fetch ────────────────────────────────────────────────────
async function fetchOffers(): Promise<Offer[]> {
    try {
        const res = await fetch(`${API}/offers`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ruleLabel(offer: Offer): string {
    const { type, discountValue, buyQuantity, getQuantity, minimumCartValue } = offer.rule;
    switch (type) {
        case "percentage_discount":
            return discountValue ? `${discountValue}% Off` : "Percentage Discount";
        case "fixed_discount":
            return discountValue ? `₹${discountValue} Off` : "Fixed Discount";
        case "buy_x_get_y_free":
            return `Buy ${buyQuantity || "X"} Get ${getQuantity || "Y"} Free`;
        case "combo_discount":
            return "Combo Deal";
        case "minimum_cart_discount":
            return minimumCartValue
                ? `${discountValue}% Off on orders above ₹${minimumCartValue}`
                : "Min Cart Discount";
        case "free_shipping":
            return "Free Shipping";
        default:
            return type.replace(/_/g, " ");
    }
}

function badgeColor(type: string): string {
    switch (type) {
        case "free_shipping": return "#06b6d4";
        case "buy_x_get_y_free": return "#8b5cf6";
        case "percentage_discount": return "#f59e0b";
        case "fixed_discount": return "#10b981";
        case "combo_discount": return "#ec4899";
        default: return "#64748b";
    }
}

function fmtDate(d?: string) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Structured data (SpecialAnnouncement) ─────────────────────────────────────
function offersJsonLd(offers: Offer[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Current Offers",
        url: `${SITE_URL}/offers`,
        numberOfItems: offers.length,
        itemListElement: offers.map((o, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/offers/${o.slug}`,
            name: o.title,
        })),
    };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function OffersPage() {
    const offers = await fetchOffers();

    return (
        <>
            {/* Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(offersJsonLd(offers)) }}
            />

            {/* Banner */}
            <section
                className="page_banner"
                style={{ background: "url('/assets/images/bannerOther.jpg')" }}
            >
                <div className="page_banner_overlay">
                    <div className="container">
                        <div className="page_banner_text">
                            <h1>Current Offers & Deals</h1>
                            <p>Limited-time promotions on your favourite healthy snacks</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Offers grid */}
            <section style={{ padding: "60px 0 80px", background: "#0f172a", minHeight: "50vh" }}>
                <div className="container">
                    {offers.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                            <i className="fas fa-tag" style={{ fontSize: 48, marginBottom: 16, display: "block", opacity: 0.3 }} />
                            <h2 style={{ color: "#cbd5e1", marginBottom: 8 }}>No active offers right now</h2>
                            <p>Check back soon — new deals are added regularly!</p>
                            <Link href="/products" style={{ display: "inline-block", marginTop: 24, padding: "12px 32px", background: "#f59e0b", color: "#0f172a", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
                                Browse Products
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                            {offers.map((offer) => (
                                <article
                                    key={offer._id}
                                    style={{
                                        background: "#1e293b",
                                        borderRadius: 16,
                                        overflow: "hidden",
                                        border: "1px solid #334155",
                                        transition: "transform 0.2s, box-shadow 0.2s",
                                        display: "flex",
                                        flexDirection: "column",
                                    }}
                                >
                                    {/* Offer image */}
                                    <div style={{ position: "relative", height: 180, background: "#0f172a", overflow: "hidden" }}>
                                        {offer.image ? (
                                            <Image
                                                src={offer.image}
                                                alt={offer.title}
                                                fill
                                                style={{ objectFit: "cover" }}
                                                sizes="(max-width: 768px) 100vw, 400px"
                                            />
                                        ) : (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                                <i className="fas fa-tag" style={{ fontSize: 48, color: "#334155" }} />
                                            </div>
                                        )}
                                        {/* Rule type badge */}
                                        <div style={{
                                            position: "absolute", top: 12, left: 12,
                                            background: badgeColor(offer.rule.type),
                                            color: "#fff", fontSize: 11, fontWeight: 700,
                                            padding: "4px 10px", borderRadius: 20, letterSpacing: 0.5,
                                        }}>
                                            {ruleLabel(offer)}
                                        </div>
                                        {/* Custom badge text */}
                                        {offer.badgeText && (
                                            <div style={{
                                                position: "absolute", top: 12, right: 12,
                                                background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)",
                                                color: "#f59e0b", fontSize: 11, fontWeight: 700,
                                                padding: "4px 10px", borderRadius: 20, letterSpacing: 0.5,
                                            }}>
                                                {offer.badgeText}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: "20px 20px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, lineHeight: 1.3 }}>
                                            {offer.title}
                                        </h2>
                                        {offer.description && (
                                            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 12, lineHeight: 1.6 }}>
                                                {offer.description.length > 120 ? offer.description.slice(0, 120) + "…" : offer.description}
                                            </p>
                                        )}
                                        {/* Validity */}
                                        {(offer.startDate || offer.endDate) && (
                                            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                                                {offer.startDate && `From ${fmtDate(offer.startDate)}`}
                                                {offer.startDate && offer.endDate && " · "}
                                                {offer.endDate && `Valid till ${fmtDate(offer.endDate)}`}
                                            </p>
                                        )}
                                        <div style={{ marginTop: "auto", paddingTop: 12 }}>
                                            <Link
                                                href={`/offers/${offer.slug}`}
                                                style={{
                                                    display: "block", textAlign: "center",
                                                    padding: "10px 24px", borderRadius: 8,
                                                    background: "#f59e0b", color: "#0f172a",
                                                    fontWeight: 700, fontSize: 14, textDecoration: "none",
                                                    transition: "background 0.2s",
                                                }}
                                            >
                                                {offer.ctaText || "View Offer"}
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
