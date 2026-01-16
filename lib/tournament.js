const { v4: uuidv4 } = require('uuid');

/**
 * Round-Robin Tournament System
 * Handles tournament creation, player management, and match scheduling
 */

/**
 * Generate round-robin pairings for tournament
 * @param {Array} players - Array of player objects with id and username
 * @returns {Array} Array of rounds, each containing match pairings
 */
function generateRoundRobinPairings(players) {
    const playersCopy = [...players];

    // Add dummy player if odd number
    if (playersCopy.length % 2 === 1) {
        playersCopy.push({ id: null, username: 'BYE' });
    }

    const rounds = [];
    const totalRounds = playersCopy.length - 1;

    for (let round = 0; round < totalRounds; round++) {
        const roundPairings = [];

        // Create pairings for this round
        for (let i = 0; i < playersCopy.length / 2; i++) {
            const player1 = playersCopy[i];
            const player2 = playersCopy[playersCopy.length - 1 - i];

            // Skip if either player is BYE
            if (player1.id && player2.id) {
                roundPairings.push({
                    player1_id: player1.id,
                    player2_id: player2.id,
                    player1_username: player1.username,
                    player2_username: player2.username
                });
            }
        }

        rounds.push(roundPairings);

        // Rotate players (keep first player fixed)
        playersCopy.splice(1, 0, playersCopy.pop());
    }

    return rounds;
}

/**
 * Calculate standings from tournament players
 * @param {Array} players - Tournament players with points, wins, losses
 * @returns {Array} Sorted standings
 */
function calculateStandings(players) {
    return players.sort((a, b) => {
        // Sort by points (descending)
        if (b.points !== a.points) return b.points - a.points;

        // Tiebreaker 1: Total wins
        if (b.wins !== a.wins) return b.wins - a.wins;

        // Tiebreaker 2: Level
        return b.level - a.level;
    });
}

module.exports = function (pool) {
    return {
        /**
         * Create a new tournament
         */
        async create(creatorId, name, settings = {}) {
            const tournamentId = uuidv4();
            const {
                maxPlayers = 8,
                timeControlSeconds = null,
                minLevel = 1
            } = settings;

            await pool.query(
                `INSERT INTO tournaments (id, name, creator_id, max_players, time_control_seconds, min_level)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [tournamentId, name, creatorId, maxPlayers, timeControlSeconds, minLevel]
            );

            return tournamentId;
        },

        /**
         * Get tournament by ID
         */
        async findById(tournamentId) {
            const result = await pool.query(
                'SELECT * FROM tournaments WHERE id = $1',
                [tournamentId]
            );
            return result.rows[0] || null;
        },

        /**
         * Get all open tournaments
         */
        async findOpen() {
            const result = await pool.query(
                `SELECT t.*, 
                        u.username as creator_username,
                        COUNT(tp.id) as player_count
                 FROM tournaments t
                 LEFT JOIN users u ON t.creator_id = u.id
                 LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
                 WHERE t.status = 'registration'
                 GROUP BY t.id, u.username
                 ORDER BY t.created_at DESC`
            );
            return result.rows;
        },

        /**
         * Join a tournament
         */
        async join(tournamentId, userId, username, level) {
            const tournament = await this.findById(tournamentId);

            if (!tournament) {
                throw new Error('Tournament not found');
            }

            if (tournament.status !== 'registration') {
                throw new Error('Tournament has already started');
            }

            if (tournament.current_players >= tournament.max_players) {
                throw new Error('Tournament is full');
            }

            if (level < tournament.min_level) {
                throw new Error(`Minimum level ${tournament.min_level} required`);
            }

            // Check if already joined
            const existing = await pool.query(
                'SELECT id FROM tournament_players WHERE tournament_id = $1 AND user_id = $2',
                [tournamentId, userId]
            );

            if (existing.rows.length > 0) {
                throw new Error('Already joined this tournament');
            }

            // Add player
            await pool.query(
                `INSERT INTO tournament_players (tournament_id, user_id, username, level)
                 VALUES ($1, $2, $3, $4)`,
                [tournamentId, userId, username, level]
            );

            // Update player count
            await pool.query(
                'UPDATE tournaments SET current_players = current_players + 1 WHERE id = $1',
                [tournamentId]
            );
        },

        /**
         * Leave a tournament
         */
        async leave(tournamentId, userId) {
            const tournament = await this.findById(tournamentId);

            if (!tournament) {
                throw new Error('Tournament not found');
            }

            if (tournament.status !== 'registration') {
                throw new Error('Cannot leave after tournament has started');
            }

            const result = await pool.query(
                'DELETE FROM tournament_players WHERE tournament_id = $1 AND user_id = $2 RETURNING id',
                [tournamentId, userId]
            );

            if (result.rows.length > 0) {
                await pool.query(
                    'UPDATE tournaments SET current_players = current_players - 1 WHERE id = $1',
                    [tournamentId]
                );
            }
        },

        /**
         * Start a tournament
         */
        async start(tournamentId) {
            const tournament = await this.findById(tournamentId);

            if (!tournament) {
                throw new Error('Tournament not found');
            }

            if (tournament.current_players < 3) {
                throw new Error('Need at least 3 players to start');
            }

            // Get all players
            const playersResult = await pool.query(
                'SELECT user_id as id, username FROM tournament_players WHERE tournament_id = $1',
                [tournamentId]
            );

            const players = playersResult.rows;

            // Generate round-robin pairings
            const rounds = generateRoundRobinPairings(players);

            // Create matches for round 1
            for (const pairing of rounds[0]) {
                await pool.query(
                    `INSERT INTO tournament_matches (tournament_id, round_number, player1_id, player2_id, status)
                     VALUES ($1, 1, $2, $3, 'pending')`,
                    [tournamentId, pairing.player1_id, pairing.player2_id]
                );
            }

            // Update tournament status
            await pool.query(
                `UPDATE tournaments 
                 SET status = 'in_progress', 
                     started_at = CURRENT_TIMESTAMP,
                     current_round = 1,
                     total_rounds = $1
                 WHERE id = $2`,
                [rounds.length, tournamentId]
            );

            return rounds;
        },

        /**
         * Get tournament players
         */
        async getPlayers(tournamentId) {
            const result = await pool.query(
                'SELECT * FROM tournament_players WHERE tournament_id = $1 ORDER BY points DESC, wins DESC',
                [tournamentId]
            );
            return result.rows;
        },

        /**
         * Get tournament matches for a specific round
         */
        async getMatches(tournamentId, roundNumber) {
            const result = await pool.query(
                `SELECT tm.*, 
                        u1.username as player1_username,
                        u2.username as player2_username
                 FROM tournament_matches tm
                 LEFT JOIN users u1 ON tm.player1_id = u1.id
                 LEFT JOIN users u2 ON tm.player2_id = u2.id
                 WHERE tm.tournament_id = $1 AND tm.round_number = $2
                 ORDER BY tm.id`,
                [tournamentId, roundNumber]
            );
            return result.rows;
        },

        /**
         * Link a game to a tournament match
         */
        async linkGameToMatch(matchId, gameId) {
            await pool.query(
                `UPDATE tournament_matches 
                 SET game_id = $1, status = 'in_progress'
                 WHERE id = $2`,
                [gameId, matchId]
            );
        },

        /**
         * Get match by game ID
         */
        async getMatchByGameId(gameId) {
            const result = await pool.query(
                'SELECT * FROM tournament_matches WHERE game_id = $1',
                [gameId]
            );
            return result.rows[0] || null;
        },

        /**
         * Record match result
         */
        async recordResult(matchId, winnerId) {
            const match = await pool.query(
                'SELECT * FROM tournament_matches WHERE id = $1',
                [matchId]
            );

            if (match.rows.length === 0) {
                throw new Error('Match not found');
            }

            const matchData = match.rows[0];
            const loserId = matchData.player1_id === winnerId ? matchData.player2_id : matchData.player1_id;

            // Update match
            await pool.query(
                `UPDATE tournament_matches 
                 SET winner_id = $1, status = 'completed'
                 WHERE id = $2`,
                [winnerId, matchId]
            );

            // Update player stats (3 points for win, 0 for loss)
            await pool.query(
                `UPDATE tournament_players 
                 SET points = points + 3, wins = wins + 1
                 WHERE tournament_id = $1 AND user_id = $2`,
                [matchData.tournament_id, winnerId]
            );

            await pool.query(
                `UPDATE tournament_players 
                 SET losses = losses + 1
                 WHERE tournament_id = $1 AND user_id = $2`,
                [matchData.tournament_id, loserId]
            );
        },

        /**
         * Get tournament standings
         */
        async getStandings(tournamentId) {
            const players = await this.getPlayers(tournamentId);
            return calculateStandings(players);
        },

        /**
         * Check if current round is complete
         */
        async isRoundComplete(tournamentId, roundNumber) {
            const result = await pool.query(
                `SELECT COUNT(*) as total, 
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
                 FROM tournament_matches
                 WHERE tournament_id = $1 AND round_number = $2`,
                [tournamentId, roundNumber]
            );

            const { total, completed } = result.rows[0];
            return parseInt(total) === parseInt(completed);
        },

        /**
         * Complete tournament
         */
        async complete(tournamentId) {
            await pool.query(
                `UPDATE tournaments 
                 SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [tournamentId]
            );
        }
    };
};
