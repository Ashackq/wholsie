"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login - feature temporarily disabled
    router.replace("/login");
  }, [router]);

  return (
    <>
      {/* Page Banner */}
      <section
        className="page_banner"
        style={{ background: "url(/assets/images/bannerOther.jpg)" }}
      >
        <div className="page_banner_overlay">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="page_banner_text wow fadeInUp">
                  <h1>Reset Password</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sign_in mt_50 mb_50">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 text-center">
              <p>Redirecting...</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
