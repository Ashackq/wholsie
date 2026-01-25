"use client";

import { useEffect, useState } from "react";
import { useLayout } from "../context/LayoutContext";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export default function Footer() {
  const { hideHeaderFooter } = useLayout();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/categories`;
        const response = await fetch(url);
        const data = await response.json();
        setCategories(data.data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsPhone(window.innerWidth < 450);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (hideHeaderFooter) return null;

  return (
    <footer
      className="gadget_footer footer_2 mt_55"
      style={{
        backgroundImage: `url('/assets/images/slider/${isPhone ? 'footerback_phone' : 'footerback'}.jpg')`,
        height: "auto",
        width: "100%",
        backgroundSize: "cover",
        backgroundPosition: "center",
        paddingTop: isPhone ? "200px" : "460px",
      }}
    >
      <div className="container">
        <div className="row justify-content-between">
          <div className="col-xl-3 col-md-6 col-lg-3 col-12 wow fadeInUp">
            <div className="footer_2_logo_area">
              <a href="/" className="footer_logo">
                <img
                  src="/assets/images/logo/wholesi_white.png"
                  alt="logo"
                  className="img-fluid w-100"
                />
              </a>
              <p>Healthy Millet &amp; Makhana Snacks Online - Wholesiii </p>
              <ul>
                <li>
                  <span>Follow :</span>
                </li>
                <li>
                  <a href="https://www.instagram.com/wholesiiifoods" target="_blank" rel="noreferrer">
                    <i className="fab fa-instagram"></i>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/+919209307191"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fab fa-whatsapp"></i>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-xl-2 col-6 col-md-4 col-lg-2 wow fadeInUp">
            <div className="footer_link">
              <h3>Company</h3>
              <ul>
                <li>
                  <a href="/" className="footer-menu_item">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/about" className="footer-menu_item">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="/contact" className="footer-menu_item">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-xl-2 col-6 col-md-4 col-lg-2 wow fadeInUp">
            <div className="footer_link">
              <h3>Category</h3>
              <ul>
                {categories.map((category) => (
                  <li key={category._id}>
                    <a
                      href={`/products?category=${category.slug}`}
                      className="footer-menu_item"
                    >
                      {category.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="col-xl-2 col-6 col-md-4 col-lg-2 wow fadeInUp">
            <div className="footer_link">
              <h3>Quick Links</h3>
              <ul>
                <li>
                  <a href="/privacy-policy" className="footer-menu_item">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/shipping-policy" className="footer-menu_item">
                    Shipping
                  </a>
                </li>
                <li>
                  <a href="/terms-conditions" className="footer-menu_item">
                    Terms &amp; Conditions
                  </a>
                </li>
                <li>
                  <a href="/refund-policy" className="footer-menu_item">
                    Cancellation &amp; Refund Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-xl-3 col-6 col-md-4 col-lg-3 wow fadeInUp">
            <div className="footer_link footer_logo_area">
              <h3>Contact Us</h3>
              <span>
                <b>
                  <img
                    src="/assets/images/location_icon_white.png"
                    alt="Map"
                    className="img-fluid"
                  />
                </b>
                123 Business Street, City, State 12345
              </span>
              <span>
                <b>
                  <img
                    src="/assets/images/phone_icon_white.png"
                    alt="Call"
                    className="img-fluid"
                  />
                </b>
                <a href="callto:+919209307191">+91 9209307191</a>
              </span>
              <span>
                <b>
                  <img
                    src="/assets/images/mail_icon_white.png"
                    alt="Mail"
                    className="img-fluid"
                  />
                </b>
                <a href="mailto:info@wholesiii.com">info@wholesiii.com</a>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="footer_copyright mt_55">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="gadget_footer_copyright">
                <p>
                  Copyright @ <b>Wholesiii</b> 2025. All right reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
