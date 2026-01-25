"use client";

import Link from "next/link";

export default function CareersPage() {
    return (
        <><section className="page_banner" style={{ background: "url('/assets/images/bannerOther.jpg')" }}>
            <div className="page_banner_overlay">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <div className="page_banner_text">
                                <h1>Careers</h1>
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
                                <h3>Join Our Team</h3>
                                <p>We're always looking for talented individuals to join Wholesiii. If you're passionate about healthy snacking and want to be part of our mission, we'd love to hear from you.</p>

                                <h3 style={{ marginTop: "30px" }}>Current Openings</h3>
                                <p>To view current job openings and apply, please send your resume and cover letter to <a href="mailto:careers@wholesiii.com">careers@wholesiii.com</a></p>

                                <p className="last-updated">Last updated: January 6, 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section></>
    );
}

