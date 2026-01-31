/**
 * Schema.org JSON-LD Builder Utility
 * Helper functions to generate proper Schema.org structured data
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const SchemaBuilder = {
    /**
     * Generate Organization Schema
     */
    organization: (overrides?: any) => ({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Wholesiii',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description: 'Premium healthy snacks and baked goods with zero cholesterol and no artificial additives.',
        sameAs: [

            'https://www.instagram.com/wholesiiifoods',
        ],
        address: {
            '@type': 'PostalAddress',
            streetAddress: '610, A/p. Songaon tarf, Nisrale',
            addressLocality: 'Nisrale',
            addressRegion: 'Maharashtra',
            postalCode: '415519',
            addressCountry: 'IN',
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            email: 'support@wholesiii.com',
            availableLanguage: ['en', 'hi'],
        },
        ...overrides,
    }),

    /**
     * Generate Product Schema
     */
    product: (product: any, overrides?: any) => ({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name || product.title,
        description: product.description || 'Premium healthy snack from Wholesiii',
        image: product.image ? `${siteUrl}${product.image}` : `${siteUrl}/placeholder.jpg`,
        url: `${siteUrl}/products/${product.slug}`,
        sku: product.sku || product.slug,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'Wholesiii',
        },
        offers: {
            '@type': 'Offer',
            url: `${siteUrl}/products/${product.slug}`,
            priceCurrency: 'INR',
            price: product.price || product.salePrice || product.discountedPrice || 0,
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: 'Wholesiii',
            },
        },
        ...(product.rating && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                ratingCount: product.reviewCount || 0,
            },
        }),
        ...overrides,
    }),

    /**
     * Generate Breadcrumb Schema
     */
    breadcrumb: (items: Array<{ name: string; url: string }>) => ({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${siteUrl}${item.url}`,
        })),
    }),

    /**
     * Generate FAQ Schema
     */
    faq: (faqs: Array<{ question: string; answer: string }>) => ({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    }),

    /**
     * Generate Review Schema
     */
    review: (product: any, review: any) => ({
        '@context': 'https://schema.org',
        '@type': 'Review',
        '@id': `${siteUrl}/products/${product.slug}#review-${review.id}`,
        author: {
            '@type': 'Person',
            name: review.author || 'Anonymous',
        },
        datePublished: review.date || new Date().toISOString(),
        description: review.text || '',
        name: `Review of ${product.name}`,
        reviewRating: {
            '@type': 'Rating',
            ratingValue: review.rating || 5,
            bestRating: '5',
            worstRating: '1',
        },
    }),

    /**
     * Generate Event Schema
     */
    event: (event: any) => ({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
            '@type': 'Place',
            name: event.location || 'Online',
            url: event.url || siteUrl,
        },
        image: event.image || `${siteUrl}/placeholder.jpg`,
        organizer: {
            '@type': 'Organization',
            name: 'Wholesiii',
            url: siteUrl,
        },
    }),

    /**
     * Generate LocalBusiness Schema (if applicable)
     */
    localBusiness: (business: any) => ({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: business.name || 'Wholesiii',
        image: business.image || `${siteUrl}/logo.png`,
        '@id': `${siteUrl}#business`,
        url: siteUrl,
        telephone: business.phone || '+919209307191',
        address: {
            '@type': 'PostalAddress',
            streetAddress: business.street || '610, A/p. Songaon tarf, Nisrale',
            addressLocality: business.city || 'Nisrale',
            addressRegion: business.state || 'Maharashtra',
            postalCode: business.zipCode || '415519',
            addressCountry: 'IN',
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: business.latitude || '',
            longitude: business.longitude || '',
        },
        openingHoursSpecification: business.hours || [
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '18:00',
            },
        ],
    }),

    /**
     * Generate Article Schema
     */
    article: (article: any) => ({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        image: article.image || `${siteUrl}/placeholder.jpg`,
        datePublished: article.publishedDate,
        dateModified: article.modifiedDate || article.publishedDate,
        author: {
            '@type': 'Person',
            name: article.author || 'Wholesiii Team',
        },
        publisher: {
            '@type': 'Organization',
            name: 'Wholesiii',
            logo: {
                '@type': 'ImageObject',
                url: `${siteUrl}/logo.png`,
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${siteUrl}${article.url || '/'}`,
        },
    }),

    /**
     * Generate Recipe Schema
     */
    recipe: (recipe: any) => ({
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: recipe.name,
        description: recipe.description,
        image: recipe.image || `${siteUrl}/placeholder.jpg`,
        author: {
            '@type': 'Person',
            name: recipe.author || 'Wholesiii',
        },
        prepTime: recipe.prepTime || 'PT15M',
        cookTime: recipe.cookTime || 'PT30M',
        totalTime: recipe.totalTime || 'PT45M',
        recipeYield: recipe.yield || '4 servings',
        recipeCategory: recipe.category || 'Snack',
        recipeCuisine: recipe.cuisine || 'Indian',
        recipeIngredient: recipe.ingredients || [],
        recipeInstructions: recipe.instructions || [],
        nutrition: recipe.nutrition || {
            '@type': 'NutritionInformation',
            calories: recipe.calories || '0',
        },
    }),

    /**
     * Generate Video Schema
     */
    video: (video: any) => ({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnail,
        uploadDate: video.uploadDate,
        duration: video.duration || 'PT10M',
        url: video.url,
        embedUrl: video.embedUrl,
    }),
};

export default SchemaBuilder;
