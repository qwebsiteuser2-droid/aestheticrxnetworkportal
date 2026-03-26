# Database Scripts Directory

**Last Updated:** January 14, 2026

This directory contains database-related SQL scripts and utilities.

## 📋 Scripts Overview

### Import Scripts
- `import-doctors-from-csv.sql` - Import doctors from CSV file
- `import-doctors-simple.sql` - Simple doctor import script
- `seed-railway-database.sql` - Seed Railway database with initial data

## 🚀 Usage

These scripts are typically run against the production Railway database or local development database.

### Running Scripts

**Using psql:**
```bash
psql "$DATABASE_URL" -f scripts/import-doctors-simple.sql
```

**Using Railway CLI:**
```bash
railway connect postgres
# Then run SQL commands
```

## 📝 Notes

- Always backup database before running import scripts
- Verify database connection before running scripts
- Check script contents before execution
- Some scripts may require specific data formats

---

**Last Updated:** January 14, 2026

