import { Schema, model } from 'mongoose';

const addressSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        address: { type: String, required: true },
        address2: String,
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        landmark: String,
        latitude: Number,
        longitude: Number,
        isDefault: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const Address = model('Address', addressSchema);
