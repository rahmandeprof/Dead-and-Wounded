/**
 * Database Migration Script
 * Adds AI opponent and practice mode columns to games table
 * 
 * Run this once to update your production database:
 * node migrate-ai-columns.js
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting database migration...');

        // Check if columns already exist
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'games' 
            AND column_name IN ('is_ai', 'ai_difficulty', 'is_practice')
        `;

        const existingColumns = await client.query(checkQuery);
        const existingColumnNames = existingColumns.rows.map(row => row.column_name);

        console.log('Existing AI columns:', existingColumnNames);

        // Add is_ai column if it doesn't exist
        if (!existingColumnNames.includes('is_ai')) {
            console.log('➕ Adding is_ai column...');
            await client.query(`
                ALTER TABLE games 
                ADD COLUMN is_ai BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Added is_ai column');
        } else {
            console.log('⏭️  is_ai column already exists');
        }

        // Add ai_difficulty column if it doesn't exist
        if (!existingColumnNames.includes('ai_difficulty')) {
            console.log('➕ Adding ai_difficulty column...');
            await client.query(`
                ALTER TABLE games 
                ADD COLUMN ai_difficulty TEXT
            `);
            console.log('✅ Added ai_difficulty column');
        } else {
            console.log('⏭️  ai_difficulty column already exists');
        }

        // Add is_practice column if it doesn't exist
        if (!existingColumnNames.includes('is_practice')) {
            console.log('➕ Adding is_practice column...');
            await client.query(`
                ALTER TABLE games 
                ADD COLUMN is_practice BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Added is_practice column');
        } else {
            console.log('⏭️  is_practice column already exists');
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate()
    .then(() => {
        console.log('🎉 Database is ready for AI opponent and practice mode!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration error:', error);
        process.exit(1);
    });
