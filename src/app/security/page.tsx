"use client";


export default function SecurityPage() {
    return (
        <><section className="page_banner" style={{ background: "url('/assets/images/banners.jpg')" }}>
            <div className="page_banner_overlay">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="page_banner_text">
                                <h1>Security</h1>
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
                                <h3>Our Security Commitment</h3>
                                <p>We prioritize the security of your data and transactions. Industry-standard encryption protects payment information, and access to customer data is restricted to authorized personnel only.</p>
                                <p>Regular audits, secure hosting, and monitored access controls help safeguard the platform. If you have any concerns about security or notice suspicious activity, please reach out to <a href="mailto:wholesiii@gmail.com">wholesiii@gmail.com</a>.</p>

                                <p className="last-updated">Last updated: January 6, 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section></>
    );
}

