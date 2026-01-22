"use client";
import { useEffect, useState } from "react";
import { useLayout } from "../context/LayoutContext";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

export default function Header() {
    const { hideHeaderFooter } = useLayout();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug?: string }>>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const API = process.env.NEXT_PUBLIC_API_URL;
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            sessionStorage.clear();
            setIsLoggedIn(false);
            router.push("/");
            setMobileOpen(false);
        } catch (e) {
            // ignore
        }
    };

    useEffect(() => {
        // Check if user is logged in
        const user = localStorage.getItem("user");
        setIsLoggedIn(!!user);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    useEffect(() => {
        // Load categories for menu
        (async () => {
            try {
                const res = await fetch(`${API}/categories`, { credentials: "include" });
                const data = await res.json();
                if (Array.isArray(data.data)) setCategories(data.data);
            } catch {
                // ignore load errors silently
            }
        })();
    }, [API]);

    if (hideHeaderFooter) return null;

    return (
        <>
            <div>

                <header className={`header_2`}>
                    <div className="container">
                        <div className="row align-items-center">
                            <div className="col-lg-3">
                                <div className="header_logo_area">
                                    <a href="/" className="header_logo">
                                        <img
                                            src="/assets/images/logo/wholesi.png"
                                            alt="logo"
                                        />
                                    </a>
                                    <ul className="mobile_menu_header1 d-flex flex-wrap d-block d-lg-none">
                                        <li>
                                            <a
                                                id="cart_count_header"
                                                href={isLoggedIn ? "/cart" : "/login"}
                                                className="nav-icon-item cart_count_header"
                                            >
                                                <b>
                                                    <img
                                                        src="/assets/images/cart_black.svg"
                                                        alt="cart"
                                                        className="img-fluid"
                                                    />
                                                </b>
                                            </a>
                                        </li>
                                        <li>
                                            <a className="user" href={isLoggedIn ? "/profile" : "/login"}>
                                                <b>
                                                    <img
                                                        src="/assets/images/user_icon_black.svg"
                                                        alt="user"
                                                        className="img-fluid"
                                                    />
                                                </b>
                                            </a>
                                        </li>
                                    </ul>
                                    <button
                                        type="button"
                                        className="mobile_menu_icon d-block d-lg-none"
                                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                                        aria-expanded={mobileOpen}
                                        onClick={() => setMobileOpen((v) => !v)}
                                    >
                                        <span className="mobile_menu_icon">
                                            {mobileOpen ? (
                                                <i className="fal fa-times" aria-hidden="true"></i>
                                            ) : (
                                                <i className="far fa-stream menu_icon_bar" aria-hidden="true"></i>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <div className="col-xxl-6 col-xl-5 col-lg-5 d-none d-lg-block tf-form-search">
                                <form id="search-product-form" method="post" className="search-box">
                                    <input
                                        type="text"
                                        placeholder="Search product"
                                        id="search_product"
                                        className="typeahead"
                                        autoComplete="off"
                                        data-category=""
                                        defaultValue=""
                                    />
                                    <button type="submit" className="tf-btn">
                                        <i className="far fa-search icon icon-search" aria-hidden="true"></i>
                                    </button>
                                </form>
                            </div>
                            <div className="col-xxl-3 col-xl-4 col-lg-4 d-none d-lg-flex">
                                <div className="header_support_user d-flex flex-wrap">
                                    <div className="header_support">
                                        <span className="icon">
                                            <i className="far fa-phone-alt" aria-hidden="true"></i>
                                        </span>
                                        <h3>
                                            Helpline:
                                            <a href="callto:+91 9209307191">
                                                <span>+91 9209307191</span>
                                            </a>
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <nav className="main_menu_2 main_menu d-none d-lg-block animate__animated animate__fadeInDown">
                    <div className="container">
                        <div className="row">
                            <div className="col-12 d-flex flex-wrap">
                                <div className="main_menu_area">
                                    <div className={`menu_category_area ${showCategories ? 'show_category' : ''}`}>
                                        <a href="/" className="menu_logo d-none">
                                            <img src="/assets/images/logo/wholesi.png" alt="logo" />
                                        </a>

                                        <div
                                            className={`menu_category_bar ${showCategories ? 'ratate_arrow' : ''}`}
                                            role="button"
                                            aria-expanded={showCategories}
                                            onClick={() => setShowCategories((v) => !v)}
                                        >
                                            <p>
                                                <span>
                                                    <img src="/assets/images/bar_icon_white.svg" alt="category icon" />
                                                </span>
                                                Browse Categories
                                            </p>
                                            <i className="fas fa-chevron-down"></i>
                                        </div>
                                        {/* Categories dropdown */}
                                        <ul className="menu_cat_item">
                                            {categories.length === 0 && (
                                                <li>
                                                    <a href="#">No categories</a>
                                                </li>
                                            )}
                                            {categories.map((cat) => (
                                                <li key={cat._id}>
                                                    <a href={`/products?category=${cat.slug}`}>
                                                        <span>
                                                            <img src={`${(cat as any).image || 'default.png'}`} alt={cat.name} />
                                                        </span>
                                                        {cat.name}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <ul className="menu_item">
                                        <li>
                                            <a className="nav-animate" href="/">home </a>
                                        </li>
                                        <li><a className="nav-animate" href="/about">About us</a></li>
                                        <li><a className="nav-animate" href="/contact">Contact Us</a></li>
                                    </ul>
                                    <ul className="menu_icon">
                                        <li>
                                            <a id="cart_count_header" href={isLoggedIn ? "/cart" : "/login"} className="nav-icon-item cart_count_header">
                                                <b>
                                                    <img src="/assets/images/cart_black.svg" alt="cart" className="img-fluid" />
                                                </b>
                                            </a>
                                        </li>
                                        <li>
                                            <a className="user" href={isLoggedIn ? "/profile" : "/login"}>
                                                <b>
                                                    <img src="/assets/images/user_icon_black.svg" alt="cart" className="img-fluid" />
                                                </b>
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>

            <div className="mobile_menu_area d-lg-none">
                {/* Overlay */}
                {mobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-[1999]"
                        aria-hidden="true"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
                {/* Offcanvas panel (Tailwind) */}
                <div
                    className={
                        `fixed left-0 top-0 h-full w-[300px] bg-white z-[2000] transition-transform duration-300 ` +
                        (mobileOpen ? "translate-x-0" : "-translate-x-full")
                    }
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="offcanvas-body p-3">
                        <ul className="mobile_menu_header d-flex flex-wrap gap-3 mb-3">
                            <li>
                                <a id="cart_count_header" href={isLoggedIn ? "/cart" : "/login"} className="nav-icon-item cart_count_header">
                                    <b>
                                        <img src="/assets/images/cart_black.svg" alt="cart" className="img-fluid" />
                                    </b>
                                </a>
                            </li>
                            <li>
                                <a className="user" href={isLoggedIn ? "/profile" : "/login"}>
                                    <b>
                                        <img src="/assets/images/user_icon_black.svg" alt="cart" className="img-fluid" />
                                    </b>
                                </a>
                            </li>
                        </ul>

                        <form id="search-product-form" method="post" className="search-box mobile_menu_search mb-3">
                            <input
                                type="text"
                                placeholder="Search product"
                                id="search_product"
                                className="typeahead"
                                autoComplete="off"
                                data-category=""
                                defaultValue=""
                            />
                            <button type="submit" className="tf-btn">
                                <i className="far fa-search icon icon-search"></i>
                            </button>
                        </form>

                        <div className="mobile_menu_item_area">
                            <div className="mb-2 fw-semibold">Categories</div>
                            <ul className="main_mobile_menu">
                                {categories.length === 0 && (
                                    <li><a href="#">No categories</a></li>
                                )}
                                {categories.map((cat) => (
                                    <li key={`m-${cat._id}`}>
                                        <a href={`/products?category=${cat.slug}`}>
                                            {cat.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-4 mb-2 fw-semibold">Menu</div>
                            <ul className="main_mobile_menu">
                                <li>
                                    <a className="" href="/">home </a>
                                </li>
                                <li><a href="/about">About us</a></li>
                                <li><a href="/contact">Contact Us</a></li>
                                <li>
                                    <button
                                        onClick={handleLogout}
                                        className="btn btn-link p-0"
                                        style={{ color: '#d00', background: 'none', border: 'none' }}
                                    >
                                        <b>Logout</b>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
