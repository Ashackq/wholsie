# Database Backup & Restore Scripts

## Overview
These scripts allow you to backup and restore your MongoDB database in JSON format.

## Scripts

### 1. Backup Database
Exports all collections to JSON files with timestamp.

```bash
node scripts/backup-database.js
```

**Output:**
- Creates `backups/backup-[timestamp]/` directory
- Each collection saved as `[collection-name].json`
- Summary file: `_backup-summary.json`

**Example:**
```
backups/
  └── backup-2026-01-21T10-30-00-000Z/
      ├── users.json
      ├── products.json
      ├── categories.json
      ├── orders.json
      └── _backup-summary.json
```

### 2. Restore Database
Restores collections from a backup folder.

**List available backups:**
```bash
node scripts/restore-database.js
```

**Restore from specific backup:**
```bash
node scripts/restore-database.js backup-2026-01-21T10-30-00-000Z
```

**⚠️ WARNING:** This will DELETE all existing data before restoring!

You must type "DELETE AND RESTORE" to confirm.

## Workflow

### Complete Reset with Backup

1. **Backup current data:**
   ```bash
   cd server
   node scripts/backup-database.js
   ```

2. **Note the backup folder name** (e.g., `backup-2026-01-21T10-30-00-000Z`)

3. **Delete and restore:**
   ```bash
   node scripts/restore-database.js backup-2026-01-21T10-30-00-000Z
   ```

### Manual Database Reset

If you want to manually delete the database:

```bash
# Using MongoDB shell
mongosh
use wholesiii
db.dropDatabase()
```

Then restore:
```bash
node scripts/restore-database.js backup-2026-01-21T10-30-00-000Z
```

## Backup Contents

The following collections are backed up:
- users
- products
- categories
- orders
- carts
- reviews
- favorites
- notifications
- payments
- coupons
- supporttickets
- wallets
- emailtemplates
- settings

## File Format

All backups are stored as JSON arrays:

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Product Name",
    "price": 100,
    ...
  },
  ...
]
```

## Troubleshooting

**Connection Error:**
- Check MONGODB_URI in `.env` file
- Ensure MongoDB is running

**Permission Error:**
- Ensure you have write permissions in the `backups/` directory

**Empty Collections:**
- Empty collections are skipped during backup
- They will be mentioned in the summary

## Safety Tips

1. Always backup before major changes
2. Keep multiple backups (don't delete old ones immediately)
3. Verify backup contents before deleting database
4. Test restore on a development database first
5. Store important backups in a secure location

## Automation

You can add these to `package.json`:

```json
{
  "scripts": {
    "backup": "node scripts/backup-database.js",
    "restore": "node scripts/restore-database.js",
    "backup:list": "node scripts/restore-database.js"
  }
}
```

Then run:
```bash
npm run backup
npm run restore backup-2026-01-21T10-30-00-000Z
npm run backup:list
```
