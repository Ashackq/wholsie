'use client';

import React, { useEffect } from 'react';

const InstagramFeed = () => {
    useEffect(() => {
        // Load Elfsight script
        const script = document.createElement('script');
        script.src = 'https://static.elfsight.com/platform/platform.js';
        script.async = true;
        script.setAttribute('data-use-service-core', 'true');
        document.body.appendChild(script);

        // Hide the Elfsight branding link
        const observer = new MutationObserver(() => {
            const link = document.querySelector('a[href*="utm_campaign=free-widget"]') as HTMLElement;
            if (link) {
                link.style.setProperty('display', 'none', 'important');
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            document.body.removeChild(script);
        };
    }, []);

    return (
        <>
            <style>
                {`
          .instagram-feed-wrapper {
            background: #f8fafc;
            border-radius: 12px;
            width: 100%;
          }
          
          .instagram-feed-wrapper a[href*="utm_campaign=free-widget"] {
            display: none !important;
          }
        `}
            </style>
            <div className="instagram-feed-wrapper">
                <div
                    className="elfsight-app-bbe171e4-4e2b-447f-b98f-bb75ce89d98e"
                    data-elfsight-app-lazy
                    data-account-id="wholesiiifoods"
                ></div>

            </div>
        </>
    );
};

export default InstagramFeed;
