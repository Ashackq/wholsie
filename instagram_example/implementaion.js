{/* Instagram Feed Section */ }
<motion.section
    variants={sectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    className="py-16 sm:py-24 px-2 sm:px-6 md:px-12 bg-transparent"
    data-aos="fade-up"
>
    <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="inline-flex items-center bg-primaryLight rounded-full px-6 py-3 mb-8"
            >
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <span className="text-primaryDark font-semibold text-sm tracking-wide uppercase">Follow Our Instagram</span>
            </motion.div>
            <motion.h2
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl lg:text-5xl font-bold text-primaryDark"
            >
                Check out our <span className="text-primary">Instagram</span>
            </motion.h2>
        </div>
        <div className="rounded-2xl shadow-xl overflow-hidden border border-pink-100 bg-white">
            <InstagramFeed />
        </div>
    </div>
</motion.section>