/**
 * Database Backup Script
 * Exports all collections to JSON files
 * 
 * Usage: node scripts/backup-database.js
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'wholesiii';

// Collections to backup (based on your models)
const COLLECTIONS = [
    'users',
    'products',
    'categories',
    'orders',
    'carts',
    'reviews',
    'favorites',
    'notifications',
    'payments',
    'coupons',
    'supporttickets',
    'wallets',
    'emailtemplates',
    'settings',
    // Add any other collections you want to backup
];

async function backupDatabase() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('\n🔗 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected\n');

        const db = client.db(DB_NAME);

        // Create backup directory with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`📁 Backup directory: ${backupDir}\n`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('  Starting Database Backup');
        console.log('═══════════════════════════════════════════════════════\n');

        const backupSummary = {
            timestamp: new Date().toISOString(),
            database: DB_NAME,
            collections: {},
        };

        // Backup each collection
        for (const collectionName of COLLECTIONS) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();

                if (count === 0) {
                    console.log(`⏭️  ${collectionName}: No documents (skipping)`);
                    backupSummary.collections[collectionName] = { count: 0, skipped: true };
                    continue;
                }

                const documents = await collection.find({}).toArray();
                const filePath = path.join(backupDir, `${collectionName}.json`);

                fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

                console.log(`✅ ${collectionName}: ${count} documents exported`);
                backupSummary.collections[collectionName] = { count, file: `${collectionName}.json` };
            } catch (error) {
                console.log(`❌ ${collectionName}: Error - ${error.message}`);
                backupSummary.collections[collectionName] = { error: error.message };
            }
        }

        // Save backup summary
        const summaryPath = path.join(backupDir, '_backup-summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(backupSummary, null, 2));

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  Backup Complete!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log(`📦 Backup saved to: ${backupDir}`);
        console.log(`📊 Total collections backed up: ${Object.keys(backupSummary.collections).filter(k => !backupSummary.collections[k].skipped && !backupSummary.collections[k].error).length}`);
        console.log(`📄 Summary file: _backup-summary.json\n`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

backupDatabase();
