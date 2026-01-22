"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

interface Product {
  _id: string;
  name: string;
  title?: string;
  slug: string;
  price: number;
  salePrice?: number;
  discountedPrice?: number;
  discountPrice?: number;
  image: string;
  discount?: number;
  isRecentLaunch?: boolean;
  isCombo?: boolean;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentLaunches, setRecentLaunches] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [slidesPerView, setSlidesPerView] = useState(2);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/products?limit=100`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/categories`),
        ]);

        const productsJson = await productsRes.json();
        const categoriesJson = await categoriesRes.json();

        const fetchedProducts: Product[] = productsJson.data || [];
        setProducts(fetchedProducts);
        setCombos(fetchedProducts.filter((product) => product.isCombo));
        setRecentLaunches(fetchedProducts.filter((product) => product.isRecentLaunch));
        setCategories(categoriesJson.data || []);
      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const calculateSlides = () => {
      const width = window.innerWidth;
      if (width >= 1200) return 5;
      if (width >= 992) return 4;
      if (width >= 768) return 3;
      if (width >= 576) return 2;
      return 2;
    };

    const updateSlides = () => setSlidesPerView(calculateSlides());
    updateSlides();
    window.addEventListener("resize", updateSlides);
    return () => window.removeEventListener("resize", updateSlides);
  }, []);

  const shouldShowCombosNav = combos.length > slidesPerView;
  const shouldShowHotNav = products.length > slidesPerView;
  const shouldShowRecentNav = recentLaunches.length > slidesPerView;

  return (
    <>
      {/* Hero Banner Slider */}
      <img
        className="gadget_banner_slider"
        src="/assets/images/header_banner.jpg"
        alt="Slider Banner 1"
        style={{
          width: "100%",
        }}
      />
      <section className="mt_0" style={{ width: "100vw", position: "relative" }}>
        <div style={{ width: "100%", position: "relative", border: "none", outline: "none" }}>
          <Swiper
            modules={[Autoplay, Pagination, Navigation, EffectFade]}
            spaceBetween={0}
            slidesPerView={1}
            effect="fade"
            fadeEffect={{
              crossFade: true
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={false}
            navigation={{
              prevEl: ".hero-swiper-prev",
              nextEl: ".hero-swiper-next",
            }}
            loop={true}
            style={{ border: "none", outline: "none" }}
          >
            <SwiperSlide>
              <img
                className="gadget_banner_slider"
                src="/assets/images/slider/wholesiibanner1.jpg"
                alt="Slider Banner 1"
                style={{
                  width: "100%",
                  height: "600px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                className="gadget_banner_slider"
                src="/assets/images/slider/wholesiibanner2.jpg"
                alt="Slider Banner 2"
                style={{
                  width: "100%",
                  height: "600px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </SwiperSlide>
            <SwiperSlide>
              <img
                className="gadget_banner_slider"
                src="/assets/images/slider/wholesiibanner3.jpg"
                alt="Slider Banner 3"
                style={{
                  width: "100%",
                  height: "600px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </SwiperSlide>
          </Swiper>
          {/* Custom navigation buttons positioned on center-right */}
          <div className="hero-swiper-prev swiper-nav-btn swiper-nav-prev">❮</div>
          <div className="hero-swiper-next swiper-nav-btn swiper-nav-next">❯</div>
        </div>

      </section>

      {/* Category Banners */}
      <section className="add_banner pt_55">
        <div className="container">
          <div className="row">
            {categories.slice(0, 2).map((category, index) => (
              <div key={category._id} className="col-lg-6 col-md-6 col-12 wow fadeInUp" style={{ marginBottom: "0px" }} data-wow-delay={`${index * 0.2}s`}>
                <div
                  className="add_banner_item"
                  style={{
                    background: category.image
                      ? `url('/assets/images/${category.slug}.png')`
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    cursor: "pointer",
                    transition: "transform 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <div className="add_banner_item_text">
                    <h2 style={{ color: '#000' }}>&nbsp;</h2>
                    <Link className="common_btn" href={`/products?category=${category.slug}`}>
                      shop now <i className="fas fa-long-arrow-right" aria-hidden="true"></i>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Health Hampers / Combos Section (Slider) */}
      <section className="flash_sell_2 flash_sell mt_80">
        <div className="container">
          <div className="row">
            <div className="col-xl-12 wow fadeInUp" data-wow-delay="0s">
              <div className="section_heading mb_15">
                <h3>Health Hampers</h3>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="wd-load">
            <p>Loading products...</p>
          </div>
        ) : (
          <>
            {combos.length > 0 ? (
              <div style={{ width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }}>
                <div className="row flash_sell_2_slider" style={{ margin: '0 40px' }}>
                  <Swiper
                    modules={[Autoplay, Navigation]}
                    spaceBetween={16}
                    slidesPerView={2}
                    autoplay={{ delay: 4000, disableOnInteraction: false }}
                    navigation={
                      shouldShowCombosNav
                        ? {
                          prevEl: '.prevArrow3',
                          nextEl: '.nextArrow3',
                        }
                        : undefined
                    }
                    loop={combos.length > slidesPerView}
                    breakpoints={{
                      576: { slidesPerView: 2 },
                      768: { slidesPerView: 3 },
                      992: { slidesPerView: 4 },
                      1200: { slidesPerView: 5 },
                    }}
                  >
                    {combos.map((product) => {
                      const basePrice = product.price ?? 0;
                      const discounted = product.discountPrice ?? product.discountedPrice ?? product.salePrice;
                      const hasDiscount = typeof discounted === "number" && discounted < basePrice && basePrice > 0;
                      const discountPercent = hasDiscount ? Math.round((1 - discounted / basePrice) * 100) : null;
                      const finalPrice = hasDiscount ? discounted : basePrice;

                      return (
                        <SwiperSlide key={product._id}>
                          <div
                            className="gadget_product_item wow fadeInUp"
                            style={{
                              background: "linear-gradient(145deg, #ffffff 0%, #f7f9ff 100%)",
                              borderRadius: "18px",
                              padding: "14px",
                              boxShadow: "0 14px 34px rgba(0,0,0,0.08)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                              height: "100%",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{
                                  background: "#0ea5e9",
                                  color: "#fff",
                                  borderRadius: "999px",
                                  padding: "4px 10px",
                                  fontSize: "12px",
                                  letterSpacing: "0.4px",
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                }}>
                                  Healthy Hamper
                                </span>

                                {hasDiscount && (
                                  <span style={{
                                    background: "#f97316",
                                    color: "#fff",
                                    borderRadius: "999px",
                                    padding: "4px 10px",
                                    fontSize: "12px",
                                    letterSpacing: "0.4px",
                                    textTransform: "uppercase",
                                  }}>
                                    {discountPercent}% Off
                                  </span>
                                )}
                              </div>
                              <p className="rating" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", color: "#0f172a" }}>
                                <span style={{ fontWeight: 700 }}>0.0</span>
                                <i className="fas fa-star" aria-hidden="true"></i>
                                <span style={{ color: "#475569", fontSize: "12px" }}>(0 reviews)</span>
                              </p>
                            </div>

                            <Link href={`/products/${product.slug}`} style={{ display: "block", borderRadius: "12px", overflow: "hidden", background: "#f8fafc" }}>
                              <div className="img" style={{ position: "relative" }}>
                                <Image
                                  src={`/${product.image}`}
                                  alt={product.name || product.title || "Product"}
                                  width={300}
                                  height={250}
                                  className="img-fluid w-100"
                                  style={{ objectFit: "cover", width: "100%", height: "220px" }}
                                />
                              </div>
                            </Link>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                              <div className="top_text" style={{ margin: 0 }}>
                                <Link href={`/products/${product.slug}`} className="title" style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                                  {product.name || product.title}
                                </Link>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                                <div>
                                  {hasDiscount ? (
                                    <p className="price-on-sale price" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                      ₹{Math.round(finalPrice)} <del style={{ color: "#94a3b8", marginLeft: "6px", fontWeight: 500 }}>₹{Math.round(basePrice)}</del>
                                      <span style={{ color: "#f97316", marginLeft: "8px", fontWeight: 700 }}>{discountPercent}% Off</span>
                                    </p>
                                  ) : (
                                    <p className="price" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                      ₹{Math.round(finalPrice)}
                                    </p>
                                  )}
                                </div>
                                <Link
                                  href={`/products/${product.slug}`}
                                  style={{
                                    background: "#0f172a",
                                    color: "#fff",
                                    padding: "10px 14px",
                                    borderRadius: "12px",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.4px",
                                  }}
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          </div>
                        </SwiperSlide>
                      );
                    })}
                  </Swiper>
                  {shouldShowCombosNav && (
                    <>
                      <i className="far fa-arrow-left prevArrow prevArrow3" aria-hidden="true"></i>
                      <i className="far fa-arrow-right nextArrow nextArrow3" aria-hidden="true"></i>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--text-2)" }}>No combos available</p>
            )}
          </>
        )}
      </section>

      {/* Crunchy Banner */}
      <section className="">
        <img src={"/assets/images/slider/crunchysection.jpg"} />
      </section>
      {/* Recent Launches Section (Slider) */}
      <section className="flash_sell_2 flash_sell mt_80">
        <div className="container">
          <div className="row">
            <div className="col-xl-12 wow fadeInUp" data-wow-delay="0s">
              <div className="section_heading mb_15">
                <h3>Recent Launches</h3>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="wd-load">
            <p>Loading products...</p>
          </div>
        ) : (
          <>
            {recentLaunches.length > 0 ? (
              <div style={{ width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw' }}>
                <div className="row flash_sell_2_slider" style={{ margin: '0 40px' }}>
                  <Swiper
                    modules={[Autoplay, Navigation]}
                    spaceBetween={16}
                    slidesPerView={2}
                    autoplay={{ delay: 4000, disableOnInteraction: false }}
                    navigation={
                      shouldShowRecentNav
                        ? {
                          prevEl: '.prevArrow2',
                          nextEl: '.nextArrow2',
                        }
                        : undefined
                    }
                    loop={recentLaunches.length > slidesPerView}
                    breakpoints={{
                      576: { slidesPerView: 2 },
                      768: { slidesPerView: 3 },
                      992: { slidesPerView: 4 },
                      1200: { slidesPerView: 5 },
                    }}
                  >
                    {recentLaunches.map((product) => {
                      const basePrice = product.price ?? 0;
                      const discounted = product.discountPrice ?? product.discountedPrice ?? product.salePrice;
                      const hasDiscount = typeof discounted === "number" && discounted < basePrice && basePrice > 0;
                      const discountPercent = hasDiscount ? Math.round((1 - discounted / basePrice) * 100) : null;
                      const finalPrice = hasDiscount ? discounted : basePrice;

                      return (
                        <SwiperSlide key={product._id}>
                          <div
                            className="gadget_product_item wow fadeInUp"
                            style={{
                              background: "linear-gradient(145deg, #ffffff 0%, #f7f9ff 100%)",
                              borderRadius: "18px",
                              padding: "14px",
                              boxShadow: "0 14px 34px rgba(0,0,0,0.08)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                              height: "100%",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {product.isRecentLaunch && (
                                  <span className="product-badge product-badge-launch">
                                    New Launch
                                  </span>
                                )}
                                {product.isCombo && (
                                  <span className="product-badge product-badge-combo">
                                    Combo
                                  </span>
                                )}
                                {hasDiscount && (
                                  <span className="product-badge product-badge-discount">
                                    {discountPercent}% Off
                                  </span>
                                )}
                              </div>
                              <p className="rating" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", color: "#0f172a" }}>
                                <span style={{ fontWeight: 700 }}>0.0</span>
                                <i className="fas fa-star" aria-hidden="true"></i>
                                <span style={{ color: "#475569", fontSize: "12px" }}>(0 reviews)</span>
                              </p>
                            </div>

                            <Link href={`/products/${product.slug}`} style={{ display: "block", borderRadius: "12px", overflow: "hidden", background: "#f8fafc" }}>
                              <div className="img" style={{ position: "relative" }}>
                                <Image
                                  src={`/${product.image}`}
                                  alt={product.name || product.title || "Product"}
                                  width={300}
                                  height={250}
                                  className="img-fluid w-100"
                                  style={{ objectFit: "cover", width: "100%", height: "220px" }}
                                />
                              </div>
                            </Link>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                              <div className="top_text" style={{ margin: 0 }}>
                                <Link href={`/products/${product.slug}`} className="title" style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                                  {product.name || product.title}
                                </Link>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                                <div>
                                  {hasDiscount ? (
                                    <p className="price-on-sale price" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                      ₹{Math.round(finalPrice)} <del style={{ color: "#94a3b8", marginLeft: "6px", fontWeight: 500 }}>₹{Math.round(basePrice)}</del>
                                      <span style={{ color: "#f97316", marginLeft: "8px", fontWeight: 700 }}>{discountPercent}% Off</span>
                                    </p>
                                  ) : (
                                    <p className="price" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                                      ₹{Math.round(finalPrice)}
                                    </p>
                                  )}
                                </div>
                                <Link
                                  href={`/products/${product.slug}`}
                                  style={{
                                    background: "#0f172a",
                                    color: "#fff",
                                    padding: "10px 14px",
                                    borderRadius: "12px",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.4px",
                                  }}
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          </div>
                        </SwiperSlide>
                      );
                    })}
                  </Swiper>
                  {shouldShowRecentNav && (
                    <>
                      <i className="far fa-arrow-left prevArrow prevArrow2" aria-hidden="true"></i>
                      <i className="far fa-arrow-right nextArrow nextArrow2" aria-hidden="true"></i>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--text-2)" }}>No recent launches</p>
            )}
          </>
        )}
      </section>

      {/* Features Section */}
      <section className="features mt_55">
        <div className="container">
          <div className="row">
            <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0s">
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
            <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0.2s">
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
            <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0.4s">
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
            <div className="col-xl-3 col-md-6 wow fadeInUp" data-wow-delay="0.6s">
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

    </>
  );
}

