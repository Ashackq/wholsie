import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default("development"),
    MONGODB_URI: z.string().url(),
    JWT_SECRET: z.string().min(16),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
    // SMS Integration
    SMS_API_KEY: z.string().optional(),
    SMS_SENDER_ID: z.string().optional(),
    SMS_ROUTE: z.string().optional(),
    // Test helper
    TEST_SMS_TO: z.string().optional(),
    // OTP Simulation
    OTP_SIMULATION_MODE: z.coerce.boolean().default(false),
    OTP_SIMULATION_CODE: z.string().optional(),
    // Delhivery Integration
    DELHIVERY_TOKEN: z.string().optional(),
    DELHIVERY_API_URL: z.string().url().default("https://staging-express.delhivery.com"),
    TEST_PINCODE: z.string().optional(),
    SELLER_NAME: z.string().optional(),
    SELLER_ADDRESS: z.string().optional(),
    SELLER_PINCODE: z.string().optional(),
    DELHIVERY_TRACK_API_URL: z.string().url().default("https://track.delhivery.com"),
    // Aisensy Integration (placeholders)
    AISENSY_API_KEY: z.string().optional(),
    AISENSY_API_URL: z.string().optional(),
    AISENSY_PHONE: z.string().optional(),
    AISENSY_TEMPLATE_ID: z.string().optional(),
    // Email Configuration
    MAIL_HOST: z.string().default("smtp.hostinger.com"),
    MAIL_PORT: z.coerce.number().default(587),
    MAIL_USER: z.string().default("noreply@wholesiii.com"),
    MAIL_PASSWORD: z.string(),
    MAIL_FROM: z.string().default("noreply@wholesiii.com"),
    MAIL_FROM_NAME: z.string().default("Wholesiii"),
    // Store Information (for invoices)
    STORE_PHONE: z.string().optional(),
    STORE_ADDRESS: z.string().optional(),
    GST_NUMBER: z.string().optional(),
    // OAuth (placeholders)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().optional(),
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),
    FACEBOOK_REDIRECT_URI: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment variables", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
