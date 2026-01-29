
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Product } from '../src/models/Product.js';

async function migrateProducts() {
    try {
        await mongoose.connect(env.MONGODB_URI);
        console.log("Connected to DB");

        const products = await Product.find({ isCombo: true });
        console.log(`Found ${products.length} combo products.`);

        for (const p of products) {
            let packets = 1;
            let weight = p.weight || 0;

            // Heuristics based on name
            if (p.name.match(/Fab\s*4/i)) packets = 4;
            else if (p.name.match(/Famous\s*5/i)) packets = 5;
            else if (p.name.match(/Super\s*6/i)) packets = 6;
            else if (p.name.match(/Power\s*3/i)) packets = 3;
            else if (p.price > 350 || p.name.includes("Savory Snacker")) packets = 4; // Fallback for Savory Snacker

            // Correct weight if it seems to be single-packet weight
            // Assuming approx 100g per packet
            if (weight <= 150 && packets > 1) {
                weight = packets * 100;
            }

            if (p.packetCount !== packets || p.weight !== weight) {
                console.log(`Updating ${p.name}: Packets ${p.packetCount} -> ${packets}, Weight ${p.weight} -> ${weight}`);
                p.packetCount = packets;
                p.weight = weight;
                await p.save();
            } else {
                console.log(`Skipping ${p.name} (Already correct)`);
            }
        }

        console.log("Migration complete.");
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

migrateProducts();
