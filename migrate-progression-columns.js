/**
 * Database Migration Script - Add Progression Columns to Users Table
 * 
 * Run this in Railway PostgreSQL console or via:
 * node migrate-progression-columns.js
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
        console.log('🔄 Adding progression columns to users table...');

        // Add progression columns
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS title TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS profile_color TEXT DEFAULT '#6366f1',
            ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0
        `);

        console.log('✅ Progression columns added successfully!');

        // Update total_games for existing users
        console.log('🔄 Updating total_games for existing users...');
        await client.query(`
            UPDATE users 
            SET total_games = wins + losses 
            WHERE total_games = 0
        `);

        console.log('✅ Total games updated!');

        // Create achievements table if it doesn't exist
        console.log('🔄 Creating achievements table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                achievement_type TEXT NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, achievement_type)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)
        `);

        console.log('✅ Achievements table created!');

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
        console.log('🎉 Migration completed successfully!');
        console.log('   Users table now has progression columns');
        console.log('   Achievements table created');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration error:', error);
        process.exit(1);
    });
