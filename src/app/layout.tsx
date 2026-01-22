import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { LayoutProvider } from "../context/LayoutContext";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wholesii | Wholesale marketplace",
    template: "%s | Wholesii",
  },
  description:
    "Wholesii connects buyers and suppliers with fast ordering, secure payments, and real-time tracking.",
  openGraph: {
    title: "Wholesii | Wholesale marketplace",
    description:
      "Discover, compare, and order wholesale products with streamlined checkout and trusted payments.",
    url: siteUrl,
    siteName: "Wholesii",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesii | Wholesale marketplace",
    description:
      "Discover, compare, and order wholesale products with streamlined checkout and trusted payments.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <LayoutProvider>
        <head>
          <meta charSet="UTF-8" />
          <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
          <link rel="icon" href="/favicon.ico" />

          {/* Core styles from legacy PHP site */}
          <link rel="stylesheet" href="/assets/css/all.min.css" />
          <link rel="stylesheet" href="/assets/css/font-awesome.min.css" />
          <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
          <link rel="stylesheet" href="/assets/css/fonts.css" />
          <link rel="stylesheet" href="/assets/css/style.css" />
          <link rel="stylesheet" href="/assets/css/responsive.css" />

          {/* Plugin styles used across pages */}
          <link rel="stylesheet" href="/assets/css/animate.css" />
          <link rel="stylesheet" href="/assets/css/jquery.pwstabs.css" />
          <link rel="stylesheet" href="/assets/css/nice-select.css" />
          <link rel="stylesheet" href="/assets/css/select2.min.css" />
          <link rel="stylesheet" href="/assets/css/slick.css" />
          <link rel="stylesheet" href="/assets/css/toastr.css" />
          <link rel="stylesheet" href="/assets/css/venobox.min.css" />
          <link rel="stylesheet" href="/assets/css/range_slider.css" />
          <link rel="stylesheet" href="/assets/css/custom_spacing.css" />
          <link rel="stylesheet" href="/assets/css/multiple-image-video.css" />
          <link rel="stylesheet" href="/assets/css/mobile_menu.css" />
          <link rel="stylesheet" href="/assets/css/scroll_button.css" />

          {/* Font Awesome CDN as per PHP template */}
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/fontawesome.min.css"
            integrity="sha512-M5Kq4YVQrjg5c2wsZSn27Dkfm/2ALfxmun0vUE3mPiJyK53hQBHYCVAtvMYEC7ZXmYLg8DVG4tF8gD27WmDbsg=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css"
            integrity="sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </head>
        <body>
          <Header />
          {children}
          <Footer />

          {/* Core scripts: jQuery must load before plugins */}
          <Script src="/assets/js/jquery.min.js" strategy="beforeInteractive" />
          <Script src="/assets/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/toastr.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/Font-Awesome.js" strategy="afterInteractive" />

          {/* Common plugins used across pages */}
          <Script src="/assets/js/slick.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/sticky_sidebar.js" strategy="afterInteractive" />
          {/* Multiple Image/Video gallery plugin used by $('.gallery').miv(...) */}
          <Script src="/assets/js/multiple-image-video.js" strategy="afterInteractive" />
          <Script src="/assets/js/jquery.nice-select.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/select2.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/jquery.pwstabs.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/jquery.waypoints.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/jquery.marquee.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/jquery.countup.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/animated_barfiller.js" strategy="afterInteractive" />
          <Script src="/assets/js/venobox.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/wow.min.js" strategy="afterInteractive" />
          <Script src="/assets/js/simplyCountdown.js" strategy="afterInteractive" />
          <Script src="/assets/js/range_slider.js" strategy="afterInteractive" />
          <Script src="/assets/js/scroll_button.js" strategy="afterInteractive" />
          <Script src="/assets/js/custom.js" strategy="afterInteractive" />

          {/* Progress Wrap / Scroll to Top */}
          <div className="progress-wrap active-progress">
            <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
              <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" style={{ transition: "stroke-dashoffset 10ms linear", strokeDasharray: "307.919, 307.919", strokeDashoffset: "91.9861" }}></path>
            </svg>
          </div>
        </body>
      </LayoutProvider>

    </html>
  );
}
