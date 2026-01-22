import { Schema, model } from "mongoose";

const cartItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: String,
    name: String,
    price: Number,
    quantity: { type: Number, required: true, default: 1 },
    image: String,
});

const cartSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        storeId: { type: String, default: "1" },
        items: [cartItemSchema],
        couponCode: { type: String, default: "" },
        discount: { type: Number, default: 0 },
        expectedDeliveryDate: Date,
        deliveryPostalCode: String,
        subtotal: Number,
        tax: Number,
        total: Number,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const Cart = model("Cart", cartSchema);
