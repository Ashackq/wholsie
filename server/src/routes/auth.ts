import { Router, Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getDB } from "../config/database.js";
import { requireAuth, generateToken } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { sendOTP } from "../utils/sms.js";

const router = Router();

interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

// OTP storage (in production, use Redis or database)
interface OTPData {
    otp: string;
    phone: string;
    expiresAt: Date;
    attempts: number;
}

const otpStore = new Map<string, OTPData>();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
    const now = new Date();
    for (const [key, data] of otpStore.entries()) {
        if (data.expiresAt < now) {
            otpStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

// ==================== AUTHENTICATION ====================

// Register
router.post("/auth/register", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { name, email, phone, password, role = "customer" } = req.body;

        // Validate input
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if user exists
        const existingUser = await db.collection("users").findOne({
            $or: [{ email }, { phone }],
        });

        if (existingUser) {
            return res.status(400).json({ error: "Email or phone already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.collection("users").insertOne({
            name,
            email,
            phone,
            password: hashedPassword,
            role,
            status: "active",
            wallet: { balance: 0, reserved: 0 },
            addresses: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Create JWT token
        const token = generateToken({
            userId: result.insertedId.toString(),
            email,
            role,
        });

        // Set auth cookie
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: result.insertedId,
                name,
                email,
                phone,
                role,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Login
router.post("/auth/login", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        // Find user
        const user = await db.collection("users").findOne({ email });

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check password
        const isPasswordValid = password === user.password;


        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check user status
        if (user.status !== "active") {
            return res.status(403).json({ error: "User account is not active" });
        }

        // Create JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Set auth cookie
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                wallet: user.wallet,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Logout
router.post("/auth/logout", (req: AuthRequest, res: Response) => {
    res.clearCookie("token");
    return res.json({ success: true, message: "Logged out successfully" });
});

// Get current user
router.get("/auth/me", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = new ObjectId(req.user!.userId);

        const user = await db.collection("users").findOne(
            { _id: userId },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
});

// Update profile
router.put("/auth/profile", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = new ObjectId(req.user!.userId);
        const { name, phone, email, profileImage, bio } = req.body;

        // Get current user to check if email change is allowed
        const user = await db.collection("users").findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const updateData: any = { updatedAt: new Date() };
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (profileImage) updateData.profileImage = profileImage;
        if (bio) updateData.bio = bio;

        // Handle email update - only if it's the first time (email is {phone}@temp.com)
        if (email) {
            const isFirstTimeEmail = user.email === `${user.phone}@temp.com`;

            if (!isFirstTimeEmail) {
                return res.status(400).json({
                    error: "Email can only be changed once during initial setup"
                });
            }

            // Check if new email is already registered
            const existingEmail = await db.collection("users").findOne({
                email: email,
                _id: { $ne: userId }
            });

            if (existingEmail) {
                return res.status(400).json({ error: "Email already registered" });
            }

            updateData.email = email;
        }

        await db.collection("users").updateOne(
            { _id: userId },
            { $set: updateData }
        );

        res.json({
            success: true,
            message: "Profile updated",
        });
    } catch (error) {
        next(error);
    }
});

// Change password
router.post("/auth/change-password", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = new ObjectId(req.user!.userId);
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current and new password required" });
        }

        // Get user
        const user = await db.collection("users").findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.collection("users").updateOne(
            { _id: userId },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

        res.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        next(error);
    }
});

// Request password reset
router.post("/auth/reset-request", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email required" });
        }

        const user = await db.collection("users").findOne({ email });
        if (!user) {
            // Don't reveal if user exists
            return res.json({ success: true, message: "If email exists, reset link sent" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        await db.collection("users").updateOne(
            { _id: user._id },
            {
                $set: {
                    passwordResetToken: hashedToken,
                    passwordResetExpire: new Date(Date.now() + 3600000), // 1 hour
                },
            }
        );

        // TODO: Send email with reset link
        console.log(`Reset token for ${user.email}: ${resetToken}`);

        return res.json({
            success: true,
            message: "If email exists, reset link sent",
            // Remove in production:
            resetToken,
        });
    } catch (error) {
        next(error);
    }
});

// Request OTP for mobile login
router.post("/auth/request-otp", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { phone } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: "Valid 10-digit phone number required" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        otpStore.set(phone, {
            otp,
            phone,
            expiresAt,
            attempts: 0,
        });

        // Send OTP via SMS
        const smsSent = await sendOTP(phone, otp);

        if (!smsSent) {
            console.warn(`Failed to send OTP to ${phone}, but continuing...`);
        }

        return res.json({
            success: true,
            message: "OTP sent to your mobile number",
            // Remove in production:
            ...(env.NODE_ENV === "development" && { otp }),
        });
    } catch (error) {
        next(error);
    }
});

// Verify OTP and login/register
router.post("/auth/verify-otp", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: "Phone and OTP required" });
        }

        // Get stored OTP
        const storedOTP = otpStore.get(phone);

        if (!storedOTP) {
            return res.status(400).json({ error: "OTP expired or not found" });
        }

        // Check expiration
        if (storedOTP.expiresAt < new Date()) {
            otpStore.delete(phone);
            return res.status(400).json({ error: "OTP has expired" });
        }

        // Check attempts
        if (storedOTP.attempts >= 3) {
            otpStore.delete(phone);
            return res.status(400).json({ error: "Too many failed attempts" });
        }

        // Verify OTP
        if (storedOTP.otp !== otp) {
            storedOTP.attempts++;
            return res.status(400).json({
                error: "Invalid OTP",
                attemptsLeft: 3 - storedOTP.attempts,
            });
        }

        // OTP is valid, clear it
        otpStore.delete(phone);

        // Check if user exists
        let user = await db.collection("users").findOne({ phone });

        if (!user) {
            // Auto-register new user
            const result = await db.collection("users").insertOne({
                name: `User ${phone.slice(-4)}`,
                phone,
                email: `${phone}@temp.com`, // Temporary email
                password: "", // No password for OTP users
                role: "customer",
                status: "active",
                wallet: { balance: 0, reserved: 0 },
                addresses: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            user = await db.collection("users").findOne({ _id: result.insertedId });
        }

        // Check user status
        if (user.status !== "active") {
            return res.status(403).json({ error: "User account is not active" });
        }

        // Create JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Set auth cookie
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                wallet: user.wallet,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Reset password with token
router.post("/auth/reset-password", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password required" });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await db.collection("users").findOne({
            passwordResetToken: hashedToken,
            passwordResetExpire: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.collection("users").updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date(),
                },
                $unset: {
                    passwordResetToken: "",
                    passwordResetExpire: "",
                },
            }
        );

        return res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
        next(error);
    }
});

export default router;
