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
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        title TEXT DEFAULT NULL,
        badge TEXT DEFAULT NULL,
        profile_color TEXT DEFAULT '#6366f1',
        total_games INTEGER DEFAULT 0,
        win_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
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
        time_control_seconds INTEGER DEFAULT NULL,
        player1_time_remaining INTEGER DEFAULT NULL,
        player2_time_remaining INTEGER DEFAULT NULL,
        last_move_time BIGINT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guesses (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        guess TEXT NOT NULL,
        dead INTEGER NOT NULL,
        wounded INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creator_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'registration',
        max_players INTEGER DEFAULT 8,
        current_players INTEGER DEFAULT 0,
        current_round INTEGER DEFAULT 0,
        total_rounds INTEGER DEFAULT 0,
        time_control_seconds INTEGER,
        min_level INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        username TEXT NOT NULL,
        level INTEGER NOT NULL,
        points INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id SERIAL PRIMARY KEY,
        tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        player1_id INTEGER REFERENCES users(id),
        player2_id INTEGER REFERENCES users(id),
        game_id TEXT REFERENCES games(id),
        winner_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dignifiables (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        game_id TEXT REFERENCES games(id),
        tournament_id TEXT REFERENCES tournaments(id),
        metadata JSONB,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, type, game_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS player_stats (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_pvp_games INTEGER DEFAULT 0,
        total_ai_games INTEGER DEFAULT 0,
        total_tournament_games INTEGER DEFAULT 0,
        avg_guesses_to_win DECIMAL(4,2) DEFAULT 0,
        avg_game_duration INTEGER DEFAULT 0,
        perfect_games INTEGER DEFAULT 0,
        comeback_wins INTEGER DEFAULT 0,
        fastest_win INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenged_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        time_control_seconds INTEGER,
        status TEXT DEFAULT 'pending',
        game_id TEXT REFERENCES games(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // Auto-migration: Add progression columns if they don't exist
    console.log('Checking for progression columns...');
    try {
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

      // Update total_games for existing users
      await client.query(`
        UPDATE users 
        SET total_games = wins + losses 
        WHERE total_games = 0 AND (wins > 0 OR losses > 0)
      `);

      console.log('✅ Progression columns verified/added');
    } catch (error) {
      console.error('Warning: Could not add progression columns:', error);
    }

    // Auto-migration: Add time control columns if they don't exist
    console.log('Checking for time control columns...');
    try {
      await client.query(`
        ALTER TABLE games 
        ADD COLUMN IF NOT EXISTS time_control_seconds INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS player1_time_remaining INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS player2_time_remaining INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS last_move_time BIGINT DEFAULT NULL
      `);
      console.log('✅ Time control columns verified/added');
    } catch (error) {
      console.error('Warning: Could not add time control columns:', error);
    }

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guesses_game ON guesses(game_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_code ON games(game_code)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dignifiables_user ON dignifiables(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status)`);

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
      `SELECT id, username, wins, losses, level, xp, title, badge, profile_color, 
              total_games, win_streak, best_streak, created_at 
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async updateStats(wins, losses, id) {
    await pool.query(
      'UPDATE users SET wins = wins + $1, losses = losses + $2, total_games = total_games + 1 WHERE id = $3',
      [wins, losses, id]
    );
  },

  async addXP(userId, amount) {
    const result = await pool.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp, level',
      [amount, userId]
    );
    return result.rows[0];
  },

  async updateLevel(userId, newLevel) {
    await pool.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, userId]);
  },

  async updateStreak(userId, won) {
    if (won) {
      await pool.query(
        `UPDATE users 
         SET win_streak = win_streak + 1,
             best_streak = GREATEST(best_streak, win_streak + 1)
         WHERE id = $1`,
        [userId]
      );
    } else {
      await pool.query('UPDATE users SET win_streak = 0 WHERE id = $1', [userId]);
    }
  },

  async unlockAchievement(userId, achievementType) {
    try {
      await pool.query(
        'INSERT INTO achievements (user_id, achievement_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, achievementType]
      );
      return true;
    } catch (error) {
      return false;
    }
  },

  async getAchievements(userId) {
    const result = await pool.query(
      'SELECT achievement_type, unlocked_at FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC',
      [userId]
    );
    return result.rows;
  },

  async getLeaderboard(limit = 50) {
    const result = await pool.query(
      `SELECT id, username, level, xp, wins, losses, title, badge, profile_color, best_streak
       FROM users 
       ORDER BY level DESC, xp DESC, wins DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async updateProfile(userId, updates) {
    const { title, badge, profileColor } = updates;
    await pool.query(
      'UPDATE users SET title = $1, badge = $2, profile_color = $3 WHERE id = $4',
      [title, badge, profileColor, userId]
    );
  },

  async awardDignifiable(userId, type, gameId = null, tournamentId = null, metadata = null) {
    try {
      await pool.query(
        `INSERT INTO dignifiables (user_id, type, game_id, tournament_id, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, type, game_id) DO NOTHING`,
        [userId, type, gameId, tournamentId, metadata ? JSON.stringify(metadata) : null]
      );
      return true;
    } catch (error) {
      console.log('Dignifiable already awarded:', type);
      return false;
    }
  },

  async getDignifiables(userId) {
    const result = await pool.query(
      'SELECT * FROM dignifiables WHERE user_id = $1 ORDER BY earned_at DESC',
      [userId]
    );
    return result.rows;
  },

  async hasDignifiable(userId, type) {
    const result = await pool.query(
      'SELECT id FROM dignifiables WHERE user_id = $1 AND type = $2',
      [userId, type]
    );
    return result.rows.length > 0;
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

  async createPrivateTimed(id, player1Id, gameCode, timeControlSeconds) {
    await pool.query(
      `INSERT INTO games (id, player1_id, status, game_code, is_private, time_control_seconds, player1_time_remaining, player2_time_remaining) 
       VALUES ($1, $2, 'waiting', $3, true, $4, $4, $4)`,
      [id, player1Id, gameCode, timeControlSeconds]
    );
  },

  async createAI(id, player1Id, difficulty) {
    await pool.query(
      "INSERT INTO games (id, player1_id, status, is_ai, ai_difficulty) VALUES ($1, $2, 'waiting', true, $3)",
      [id, player1Id, difficulty]
    );
  },

  async createPractice(id, player1Id) {
    await pool.query(
      "INSERT INTO games (id, player1_id, status, is_practice) VALUES ($1, $2, 'waiting', true)",
      [id, player1Id]
    );
  },

  async findByCode(gameCode) {
    const result = await pool.query('SELECT * FROM games WHERE game_code = $1', [gameCode]);
    return result.rows[0] || null;
  },

  async findWaiting(excludePlayerId) {
    const result = await pool.query(
      `SELECT * FROM games 
       WHERE status = 'waiting' 
       AND player1_id != $1 
       AND (is_private = FALSE OR is_private IS NULL)
       AND (is_ai = FALSE OR is_ai IS NULL)
       AND (is_practice = FALSE OR is_practice IS NULL)
       LIMIT 1`,
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

  async setSecrets(gameId, player1Secret, player2Secret) {
    await pool.query(
      'UPDATE games SET player1_secret = $1, player2_secret = $2 WHERE id = $3',
      [player1Secret, player2Secret, gameId]
    );
  },

  async start(currentTurn, gameId) {
    await pool.query("UPDATE games SET status = 'playing', current_turn = $1 WHERE id = $2", [currentTurn, gameId]);
  },

  async switchTurn(nextPlayerId, gameId) {
    const now = Date.now();
    await pool.query(
      'UPDATE games SET current_turn = $1, last_move_time = $2 WHERE id = $3',
      [nextPlayerId, now, gameId]
    );
  },

  async updatePlayerTime(gameId, playerId, timeRemaining) {
    const isPlayer1 = await pool.query(
      'SELECT player1_id FROM games WHERE id = $1',
      [gameId]
    );
    const column = isPlayer1.rows[0].player1_id === playerId ? 'player1_time_remaining' : 'player2_time_remaining';

    await pool.query(
      `UPDATE games SET ${column} = $1 WHERE id = $2`,
      [timeRemaining, gameId]
    );
  },

  async checkTimeExpired(gameId, playerId) {
    const game = await pool.query(
      'SELECT player1_id, player1_time_remaining, player2_time_remaining, last_move_time FROM games WHERE id = $1',
      [gameId]
    );

    if (!game.rows[0]) return { expired: false };

    const { player1_id, player1_time_remaining, player2_time_remaining, last_move_time } = game.rows[0];
    const isPlayer1 = player1_id === playerId;
    const timeRemaining = isPlayer1 ? player1_time_remaining : player2_time_remaining;

    if (timeRemaining === null) return { expired: false };

    const elapsed = Math.floor((Date.now() - last_move_time) / 1000);
    const newTime = timeRemaining - elapsed;

    return {
      expired: newTime <= 0,
      timeRemaining: Math.max(0, newTime),
      isPlayer1
    };
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
       LEFT JOIN users u ON g.player_id = u.id 
       WHERE g.game_id = $1 
       ORDER BY g.created_at ASC`,
      [gameId]
    );
    return result.rows;
  },

  async getByPlayer(gameId, playerId) {
    // Handle NULL playerId for AI guesses
    if (playerId === null || playerId === undefined) {
      const result = await pool.query(
        'SELECT * FROM guesses WHERE game_id = $1 AND player_id IS NULL ORDER BY created_at ASC',
        [gameId]
      );
      return result.rows;
    }

    const result = await pool.query(
      'SELECT * FROM guesses WHERE game_id = $1 AND player_id = $2 ORDER BY created_at ASC',
      [gameId, playerId]
    );
    return result.rows;
  }
};

// Initialize tournament operations
const createTournamentOps = require('./tournament');
const createAnalyticsOps = require('./analytics');

module.exports = {
  init,
  userOps,
  gameOps,
  guessOps,
  tournamentOps: createTournamentOps(pool),
  analyticsOps: createAnalyticsOps(pool),
  pool // Export pool for graceful shutdown
};
