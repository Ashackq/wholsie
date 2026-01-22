export default function Head() {
    return (
        <>
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
        </>
    );
}

