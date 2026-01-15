/**
 * Database setup and operations using PostgreSQL
 */

const { Pool } = require('pg');

// Database connection pool
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATA')));
}

console.log('🔍 Connecting to database...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let initialized = false;

async function initDatabase() {
  if (initialized) return;

  const client = await pool.connect();

  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        player1_id INTEGER NOT NULL REFERENCES users(id),
        player2_id INTEGER REFERENCES users(id),
        player1_secret TEXT,
        player2_secret TEXT,
        current_turn INTEGER,
        status TEXT DEFAULT 'waiting',
        winner_id INTEGER REFERENCES users(id),
        game_code TEXT UNIQUE,
        is_private BOOLEAN DEFAULT FALSE,
        is_ai BOOLEAN DEFAULT FALSE,
        ai_difficulty TEXT,
        is_practice BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guesses (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        player_id INTEGER NOT NULL REFERENCES users(id),
        guess TEXT NOT NULL,
        dead INTEGER NOT NULL,
        wounded INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guesses_game ON guesses(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_code ON games(game_code)`);

    initialized = true;
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// User operations
const userOps = {
  async create(username, passwordHash) {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash]
    );
    return { lastInsertRowid: result.rows[0].id };
  },

  async findByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, username, wins, losses, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async updateStats(wins, losses, id) {
    await pool.query('UPDATE users SET wins = wins + $1, losses = losses + $2 WHERE id = $3', [wins, losses, id]);
  }
};

// Game operations
const gameOps = {
  async create(id, player1Id) {
    await pool.query("INSERT INTO games (id, player1_id, status) VALUES ($1, $2, 'waiting')", [id, player1Id]);
  },

  async createPrivate(id, player1Id, gameCode) {
    await pool.query(
      "INSERT INTO games (id, player1_id, status, game_code, is_private) VALUES ($1, $2, 'waiting', $3, true)",
      [id, player1Id, gameCode]
    );
  },

  async createAI(id, player1Id, difficulty) {
    await pool.query(
      "INSERT INTO games (id, player1_id, status, is_ai, ai_difficulty) VALUES ($1, $2, 'active', true, $3)",
      [id, player1Id, difficulty]
    );
  },

  async createPractice(id, player1Id) {
    await pool.query(
      "INSERT INTO games (id, player1_id, status, is_practice) VALUES ($1, $2, 'active', true)",
      [id, player1Id]
    );
  },

  async findByCode(gameCode) {
    const result = await pool.query('SELECT * FROM games WHERE game_code = $1', [gameCode]);
    return result.rows[0] || null;
  },

  async findWaiting(excludePlayerId) {
    const result = await pool.query(
      "SELECT * FROM games WHERE status = 'waiting' AND player1_id != $1 LIMIT 1",
      [excludePlayerId]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async join(player2Id, gameId) {
    await pool.query("UPDATE games SET player2_id = $1, status = 'setup' WHERE id = $2", [player2Id, gameId]);
  },

  async setPlayer1Secret(secret, gameId) {
    await pool.query('UPDATE games SET player1_secret = $1 WHERE id = $2', [secret, gameId]);
  },

  async setPlayer2Secret(secret, gameId) {
    await pool.query('UPDATE games SET player2_secret = $1 WHERE id = $2', [secret, gameId]);
  },

  async start(currentTurn, gameId) {
    await pool.query("UPDATE games SET status = 'playing', current_turn = $1 WHERE id = $2", [currentTurn, gameId]);
  },

  async switchTurn(newTurn, gameId) {
    await pool.query('UPDATE games SET current_turn = $1 WHERE id = $2', [newTurn, gameId]);
  },

  async end(winnerId, gameId) {
    await pool.query(
      "UPDATE games SET status = 'finished', winner_id = $1, finished_at = CURRENT_TIMESTAMP WHERE id = $2",
      [winnerId, gameId]
    );
  },

  async findActiveForUser(userId) {
    const result = await pool.query(
      "SELECT * FROM games WHERE (player1_id = $1 OR player2_id = $1) AND status IN ('waiting', 'setup', 'playing')",
      [userId]
    );
    return result.rows[0] || null;
  },

  async delete(gameId) {
    await pool.query('DELETE FROM games WHERE id = $1', [gameId]);
  },

  async getHistory(userId, limit = 20) {
    const result = await pool.query(
      `SELECT g.*, 
              u1.username as player1_username,
              u2.username as player2_username,
              (SELECT COUNT(*) FROM guesses WHERE game_id = g.id AND player_id = $1) as my_guesses,
              (SELECT COUNT(*) FROM guesses WHERE game_id = g.id AND player_id != $1) as opponent_guesses
       FROM games g
       LEFT JOIN users u1 ON g.player1_id = u1.id
       LEFT JOIN users u2 ON g.player2_id = u2.id
       WHERE (g.player1_id = $1 OR g.player2_id = $1) 
         AND g.status = 'finished'
       ORDER BY g.finished_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
};

// Guess operations
const guessOps = {
  async add(gameId, playerId, guess, dead, wounded) {
    await pool.query(
      'INSERT INTO guesses (game_id, player_id, guess, dead, wounded) VALUES ($1, $2, $3, $4, $5)',
      [gameId, playerId, guess, dead, wounded]
    );
  },

  async getAll(gameId) {
    const result = await pool.query(
      `SELECT g.*, u.username as player_username 
       FROM guesses g 
       JOIN users u ON g.player_id = u.id 
       WHERE g.game_id = $1 
       ORDER BY g.created_at ASC`,
      [gameId]
    );
    return result.rows;
  },

  async getByPlayer(gameId, playerId) {
    const result = await pool.query(
      'SELECT * FROM guesses WHERE game_id = $1 AND player_id = $2 ORDER BY created_at ASC',
      [gameId, playerId]
    );
    return result.rows;
  }
};

module.exports = {
  initDatabase,
  userOps,
  gameOps,
  guessOps,
  pool // Export pool for graceful shutdown
};
