/**
 * Database Restore Script
 * Restores collections from JSON backup files
 * 
 * Usage: node scripts/restore-database.js [backup-folder-name]
 * Example: node scripts/restore-database.js backup-2026-01-21T10-30-00-000Z
 * 
 * If no folder specified, will list available backups
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'wholesiii';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function listBackups() {
    const backupsDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(backupsDir)) {
        console.log('❌ No backups directory found.');
        return [];
    }

    const folders = fs.readdirSync(backupsDir)
        .filter(f => fs.statSync(path.join(backupsDir, f)).isDirectory())
        .sort()
        .reverse();

    return folders;
}

async function restoreDatabase(backupFolder) {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log('\n🔗 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected\n');

        const db = client.db(DB_NAME);

        const backupDir = path.join(__dirname, '..', 'backups', backupFolder);

        if (!fs.existsSync(backupDir)) {
            console.error(`❌ Backup directory not found: ${backupDir}`);
            process.exit(1);
        }

        // Read backup summary if exists
        const summaryPath = path.join(backupDir, '_backup-summary.json');
        let summary = null;
        if (fs.existsSync(summaryPath)) {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
            console.log(`📋 Backup Info:`);
            console.log(`   Created: ${summary.timestamp}`);
            console.log(`   Database: ${summary.database}\n`);
        }

        console.log('⚠️  WARNING: This will delete ALL existing data in the database!');
        const confirm = await question('Type "DELETE AND RESTORE" to continue: ');

        if (confirm !== 'DELETE AND RESTORE') {
            console.log('❌ Restore cancelled.');
            rl.close();
            return;
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  Starting Database Restore');
        console.log('═══════════════════════════════════════════════════════\n');

        // Get all JSON files (except summary)
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.json') && f !== '_backup-summary.json');

        const restoreSummary = {
            timestamp: new Date().toISOString(),
            database: DB_NAME,
            sourceBackup: backupFolder,
            collections: {},
        };

        for (const file of files) {
            const collectionName = file.replace('.json', '');

            try {
                const filePath = path.join(backupDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                if (!Array.isArray(data) || data.length === 0) {
                    console.log(`⏭️  ${collectionName}: No documents (skipping)`);
                    restoreSummary.collections[collectionName] = { count: 0, skipped: true };
                    continue;
                }

                // Delete existing data
                await db.collection(collectionName).deleteMany({});

                // Insert backup data
                await db.collection(collectionName).insertMany(data);

                console.log(`✅ ${collectionName}: ${data.length} documents restored`);
                restoreSummary.collections[collectionName] = { count: data.length };
            } catch (error) {
                console.log(`❌ ${collectionName}: Error - ${error.message}`);
                restoreSummary.collections[collectionName] = { error: error.message };
            }
        }

        // Save restore summary
        const restoreLogPath = path.join(backupDir, `_restore-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(restoreLogPath, JSON.stringify(restoreSummary, null, 2));

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  Restore Complete!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log(`📦 Restored from: ${backupDir}`);
        console.log(`📊 Total collections restored: ${Object.keys(restoreSummary.collections).filter(k => !restoreSummary.collections[k].skipped && !restoreSummary.collections[k].error).length}`);
        console.log(`📄 Restore log: ${restoreLogPath}\n`);

    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    } finally {
        await client.close();
        rl.close();
    }
}

// Main execution
const backupFolder = process.argv[2];

if (!backupFolder) {
    console.log('\n📦 Available Backups:\n');
    const backups = listBackups();

    if (backups.length === 0) {
        console.log('   No backups found. Run backup-database.js first.\n');
    } else {
        backups.forEach((folder, index) => {
            console.log(`   ${index + 1}. ${folder}`);
        });
        console.log('\n💡 Usage: node scripts/restore-database.js [backup-folder-name]\n');
    }
    process.exit(0);
} else {
    restoreDatabase(backupFolder);
}
