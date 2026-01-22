"use client";

import Image from "next/image";

export default function AboutPage() {
    return (
        <>
            <section className="page_banner" style={{ background: "url('/assets/images/banners.jpg')" }}>
                <div className="page_banner_overlay">
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <div className="page_banner_text wow fadeInUp">
                                    <h1>About Us</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <section className="about_us mt_100">
                <div className="container">
                    <div className="row justify-content-between align-items-center">
                        <div className="col-xxl-5 col-md-10 col-lg-6 wow fadeInLeft">
                            <div className="about_us_img">
                                <div className="img">
                                    <Image
                                        src="/assets/images/aboutusnew.jpg"
                                        alt="about us"
                                        width={600}
                                        height={600}
                                        className="img-fluid w-100"
                                    />
                                </div>
                                <h3>12+ <span>Years experience</span></h3>
                                <p>Healthy ho ya desi, Always Wholesiii.
                                    <span>Sayajeerao Kadam </span>
                                </p>
                            </div>
                        </div>
                        <div className="col-xxl-6 col-lg-6 wow fadeInRight">
                            <div className="about_us_text">
                                <h6>About Wholesiii</h6>
                                <h4>"Healthy ho ya desi, Always Wholesiii"</h4>
                                <h5>Welcome to Wholesiii — the world of smart, healthy snacking.</h5>
                                <p className="description">We are more than just a snack brand — we are a movement toward mindful eating, crafted with care, passion, and purpose.</p>
                                <ul>
                                    <li>
                                        <h4>Our Story</h4>
                                        <p>Wholesiii was born from a simple idea: </p>
                                        <p><b>"Healthy food should be delicious, accessible, and made with honesty."</b></p>
                                        <p>In a world filled with processed snacks and empty calories, we wanted to bring back real taste with real nutrition. Our founders envisioned a brand that celebrates the power of natural ingredients — inspired by traditional Indian recipes, yet designed for modern lifestyles. <br />
                                            From local farms to your table, every Wholesiii snack carries the goodness of nature's best ingredients, blended with innovative recipes that keep your taste buds happy and your body energized.
                                        </p>
                                    </li>
                                    <li>
                                        <h4>Our Mission</h4>
                                        <p>To make healthy snacking easy, enjoyable, and exciting for everyone — without compromising on flavor or nutrition. Along with that, to make available more healthy products which are used in daily cooking. <br />
                                            We aim to inspire healthier eating habits by offering honest, clean-label snacks that fuel your day — whether you're at work, traveling, studying, or hitting the gym.
                                        </p>
                                    </li>
                                    <li>
                                        <h4>Our Promise</h4>
                                        <p>At Wholesiii, every bite counts. That's why we promise:</p>
                                        <p>✅ Natural Ingredients — No preservatives, no artificial colors or flavors. <br />
                                            ✅ Nutrient-Rich Recipes — Packed with protein, fiber, and essential vitamins.<br />
                                            ✅ Mindfully Made — Using whole grains, millets, seeds, fruits, nuts, oils.<br />
                                            ✅ Sustainable Sourcing — Supporting local farmers and eco-friendly packaging.
                                        </p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features mt_55">
                <div className="container">
                    <div className="row">
                        <div className="col-xl-3 col-md-6 wow fadeInUp">
                            <div className="features_item purple">
                                <div className="icon">
                                    <Image src="/assets/images/feature-icon_1.svg" alt="feature" width={50} height={50} />
                                </div>
                                <div className="text">
                                    <h3>Free Shipping</h3>
                                    <p>Free shipping over ₹500</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0.1s">
                            <div className="features_item green">
                                <div className="icon">
                                    <Image src="/assets/images/feature-icon_3.svg" alt="feature" width={50} height={50} />
                                </div>
                                <div className="text">
                                    <h3>Support Assured</h3>
                                    <p>Outstanding premium support</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0.2s">
                            <div className="features_item orange">
                                <div className="icon">
                                    <Image src="/assets/images/feature-icon_2.svg" alt="feature" width={50} height={50} />
                                </div>
                                <div className="text">
                                    <h3>Secure Checkout</h3>
                                    <p>100% safe & encrypted payment</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0.3s">
                            <div className="features_item">
                                <div className="icon">
                                    <Image src="/assets/images/feature-icon_4.svg" alt="feature" width={50} height={50} />
                                </div>
                                <div className="text">
                                    <h3>Daily Offers</h3>
                                    <p>Get exciting offers everyday.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Choose Section */}
            <section className="about_choose mt_50 pt_50 pb_100">
                <div className="container">
                    <div className="row">
                        <div className="col-xxl-12 col-lg-12">
                            <div className="about_choose_text">
                                <div className="row">
                                    <div className="col-xl-6 col-md-6 wow fadeInUp">
                                        <div className="about_choose_text_box">
                                            <h4>Our Range</h4>
                                            <p>From baked Makhana  and millet puffs to protein bites, energy laddoos, and nut mixes, cooking oils, cookies, natural ghee. Wholesiii brings you snacks that fit your routine — whether it's your mid-morning hunger or post-workout craving..</p>
                                        </div>
                                    </div>
                                    <div className="col-xl-6 col-md-6 wow fadeInUp" data-wow-delay="0.1s">
                                        <div className="about_choose_text_box">
                                            <h4>Our Philosophy</h4>
                                            <p>We stand by three core values that define Wholesiii:
                                                Wholesome: We use ingredients your body understands — pure, clean, and nutrient-dense.<br />
                                                Simple: We keep our recipes minimal and transparent — no hidden additives, no marketing gimmicks.<br />
                                                Smart: We innovate with health in mind — snacks that taste indulgent but nourish deeply.
                                                .</p>
                                        </div>
                                    </div>
                                    <div className="col-xl-6 col-md-6 wow fadeInUp" data-wow-delay="0.2s">
                                        <div className="about_choose_text_box">
                                            <h4>Our Vision</h4>
                                            <p>To build a community that celebrates health, balance, and happiness through food. <br />
                                                We dream of a world where not only snacking becomes a healthy habit,  but people must get genuine, natural and healthy products..
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-xl-6 col-md-6 wow fadeInUp" data-wow-delay="0.3s">
                                        <div className="about_choose_text_box">
                                            <h4>Because at Wholesiii, we believe —</h4>
                                            <p>Healthy can be tasty, and tasty can be healthy. <br />
                                                So, HEALTHY HO YA DESI, ALWAYS WHOLESIII...
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section></>
    );
}

