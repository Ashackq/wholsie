"use client";

import Link from "next/link";

const links = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact Us" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-conditions", label: "Terms & Conditions" },
    { href: "/shipping-policy", label: "Shipping & Delivery" },
    { href: "/refund-policy", label: "Refund & Cancellation" },
    { href: "/security", label: "Security" },
    { href: "/cart", label: "Cart" },
    { href: "/checkout", label: "Checkout" },
    { href: "/orders", label: "My Orders" },
    { href: "/profile", label: "My Account" },
    { href: "/login", label: "Login" },
    { href: "/register", label: "Register" },
];

export default function SitemapPage() {
    return (
        <><section className="page_banner" style={{ background: "url('/assets/images/banners.jpg')" }}>
            <div className="page_banner_overlay">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="page_banner_text">
                                <h1>Sitemap</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

            <section className="return_policy mt_55 mb_100">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="privacy_policy_text">
                                <h3>Quick Access</h3>
                                <ul className="sitemap_list">
                                    {links.map((link) => (
                                        <li key={link.href}>
                                            <Link href={link.href}>{link.label}</Link>
                                        </li>
                                    ))}
                                </ul>

                                <p className="last-updated">Last updated: January 6, 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section></>
    );
}

