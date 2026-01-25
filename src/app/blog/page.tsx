"use client";


export default function BlogPage() {
    return (
        <><section className="page_banner" style={{ background: "url('/assets/images/bannerOther.jpg')" }}>
            <div className="page_banner_overlay">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="page_banner_text">
                                <h1>Blog</h1>
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
                                <h3>Latest Articles</h3>
                                <p>Coming soon! Stay tuned for health tips, product guides, and wellness stories from the Wholesiii team.</p>

                                <p className="last-updated">Last updated: January 6, 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section></>
    );
}

