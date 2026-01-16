/**
 * Database Migration Script - Make player_id nullable for AI guesses
 * 
 * Run this in Railway PostgreSQL console or via:
 * node migrate-player-id-nullable.js
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
        console.log('🔄 Making player_id nullable in guesses table...');

        // Make player_id nullable to support AI guesses
        await client.query(`
            ALTER TABLE guesses 
            ALTER COLUMN player_id DROP NOT NULL
        `);

        console.log('✅ Migration completed successfully!');
        console.log('   player_id column is now nullable for AI guesses');

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
        console.log('🎉 Database is ready for AI opponent!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration error:', error);
        process.exit(1);
    });
