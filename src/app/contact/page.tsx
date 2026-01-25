"use client";

import Image from "next/image";

export default function ContactPage() {
    return (
        <>{/* Page Banner */}
            <section className="page_banner" style={{ background: "url('/assets/images/bannerOther.jpg')" }}>
                <div className="page_banner_overlay">
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <div className="page_banner_text">
                                    <h1>Contact Us</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Us Section */}
            <section className="contact_us mt_75">
                <div className="container">
                    <div className="row">
                        <div className="col-xl-4 col-md-6">
                            <div className="contact_info">
                                <span><Image src="/assets/images/call_icon_black.png" alt="call" width={40} height={40} className="img-fluid" /></span>
                                <h3>Call Us</h3>
                                <a href="tel:+919423070102">+91 9423070102</a>
                            </div>
                        </div>
                        <div className="col-xl-4 col-md-6">
                            <div className="contact_info">
                                <span><Image src="/assets/images/mail_icon_black.png" alt="Mail" width={40} height={40} className="img-fluid" /></span>
                                <h3>Email Us</h3>
                                <a href="mailto:wholesiii@gmail.com">wholesiii@gmail.com</a>
                            </div>
                        </div>
                        <div className="col-xl-4 col-md-6">
                            <div className="contact_info">
                                <span><Image src="/assets/images/location_icon_black.png" alt="Map" width={40} height={40} className="img-fluid" /></span>
                                <h3>Our Location</h3>
                                <p>Satara, Maharashtra, India</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="contact_map mt_100">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d60823.76048686443!2d73.97706134178719!3d17.674532964932105!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc239be08d96bbd%3A0x5f4adf559fb4b19a!2sSatara%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1761220104785!5m2!1sen!2sin"
                        width="100%"
                        height="450"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            </section></>
    );
}

