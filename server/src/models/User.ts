import bcryptjs from "bcryptjs";
import { Schema, model } from "mongoose";

const userSchema = new Schema(
    {
        email: { type: String, unique: true, required: true, lowercase: true, trim: true },
        name: { type: String, default: "" },
        password: { type: String, required: true },
        phone: { type: String, sparse: true },
        firstName: { type: String, default: "" },
        lastName: { type: String, default: "" },
        avatar: { type: String, default: null },
        role: { type: String, enum: ["customer", "admin", "rider"], default: "customer" },
        status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
        address: {
            street: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
            latitude: Number,
            longitude: Number,
        },
        socialLogins: {
            google: { id: String, email: String },
            facebook: { id: String, email: String },
        },
        wallet: { type: Number, default: 0 },
        verified: { type: Boolean, default: false },
        verificationCode: String,
        passwordResetToken: String,
        passwordResetExpire: Date,
        lastLogin: Date,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const hashed = await bcryptjs.hash(this.password, 10);
    this.password = hashed;
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
    return bcryptjs.compare(plain, this.password);
};

export const User = model("User", userSchema);
