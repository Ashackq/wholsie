import { Schema, model } from "mongoose";

const settingsSchema = new Schema(
    {
        key: { type: String, unique: true, required: true },
        value: Schema.Types.Mixed,
        description: String,
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Settings = model("Settings", settingsSchema);

// Helper functions
export async function getSetting(key: string, defaultValue: any = null) {
    const setting = await Settings.findOne({ key });
    return setting ? setting.value : defaultValue;
}

export async function setSetting(key: string, value: any, description?: string) {
    return await Settings.findOneAndUpdate(
        { key },
        { value, description, updatedAt: new Date() },
        { upsert: true, new: true }
    );
}
