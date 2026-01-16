/**
 * Analytics Operations
 * Player statistics and performance metrics
 */

module.exports = function (pool) {
    return {
        /**
         * Get comprehensive player statistics
         */
        async getPlayerStats(userId) {
            // Get or create player_stats record
            let stats = await pool.query(
                'SELECT * FROM player_stats WHERE user_id = $1',
                [userId]
            );

            if (stats.rows.length === 0) {
                await pool.query(
                    'INSERT INTO player_stats (user_id) VALUES ($1)',
                    [userId]
                );
                stats = await pool.query(
                    'SELECT * FROM player_stats WHERE user_id = $1',
                    [userId]
                );
            }

            // Get game type breakdown
            const gameTypes = await pool.query(
                `SELECT 
                    COUNT(CASE WHEN is_ai = FALSE AND NOT EXISTS (
                        SELECT 1 FROM tournament_matches tm WHERE tm.game_id = g.id
                    ) THEN 1 END) as pvp_games,
                    COUNT(CASE WHEN is_ai = TRUE THEN 1 END) as ai_games,
                    COUNT(CASE WHEN EXISTS (
                        SELECT 1 FROM tournament_matches tm WHERE tm.game_id = g.id
                    ) THEN 1 END) as tournament_games
                 FROM games g
                 WHERE (player1_id = $1 OR player2_id = $1) AND status = 'finished'`,
                [userId]
            );

            // Get recent performance (last 10 games)
            const recentGames = await pool.query(
                `SELECT 
                    CASE WHEN winner_id = $1 THEN 'win' ELSE 'loss' END as result,
                    created_at
                 FROM games
                 WHERE (player1_id = $1 OR player2_id = $1) AND status = 'finished'
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [userId]
            );

            // Get most played opponents
            const opponents = await pool.query(
                `SELECT 
                    u.id,
                    u.username,
                    COUNT(*) as games_played,
                    COUNT(CASE WHEN g.winner_id = $1 THEN 1 END) as wins
                 FROM games g
                 JOIN users u ON (
                    CASE 
                        WHEN g.player1_id = $1 THEN g.player2_id
                        ELSE g.player1_id
                    END = u.id
                 )
                 WHERE (g.player1_id = $1 OR g.player2_id = $1) 
                   AND g.status = 'finished'
                   AND g.is_ai = FALSE
                 GROUP BY u.id, u.username
                 ORDER BY games_played DESC
                 LIMIT 5`,
                [userId]
            );

            // Get guess efficiency
            const guessStats = await pool.query(
                `SELECT 
                    AVG(guess_count) as avg_guesses,
                    MIN(guess_count) as min_guesses,
                    MAX(guess_count) as max_guesses
                 FROM (
                    SELECT g.id, COUNT(gu.id) as guess_count
                    FROM games g
                    LEFT JOIN guesses gu ON g.id = gu.game_id AND gu.player_id = $1
                    WHERE (g.player1_id = $1 OR g.player2_id = $1) 
                      AND g.winner_id = $1
                      AND g.status = 'finished'
                    GROUP BY g.id
                 ) as game_guesses`,
                [userId]
            );

            return {
                ...stats.rows[0],
                gameTypes: gameTypes.rows[0],
                recentPerformance: recentGames.rows,
                topOpponents: opponents.rows,
                guessEfficiency: guessStats.rows[0]
            };
        },

        /**
         * Update player stats after a game
         */
        async updatePlayerStats(userId, gameData) {
            const { isAI, isTournament, isWinner, guessCount, duration } = gameData;

            // Ensure stats record exists
            await pool.query(
                `INSERT INTO player_stats (user_id) 
                 VALUES ($1) 
                 ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            );

            // Update game counts
            if (isAI) {
                await pool.query(
                    'UPDATE player_stats SET total_ai_games = total_ai_games + 1 WHERE user_id = $1',
                    [userId]
                );
            } else if (isTournament) {
                await pool.query(
                    'UPDATE player_stats SET total_tournament_games = total_tournament_games + 1 WHERE user_id = $1',
                    [userId]
                );
            } else {
                await pool.query(
                    'UPDATE player_stats SET total_pvp_games = total_pvp_games + 1 WHERE user_id = $1',
                    [userId]
                );
            }

            // Update averages if winner
            if (isWinner && guessCount) {
                await pool.query(
                    `UPDATE player_stats 
                     SET avg_guesses_to_win = (
                        SELECT AVG(guess_count)
                        FROM (
                            SELECT COUNT(gu.id) as guess_count
                            FROM games g
                            LEFT JOIN guesses gu ON g.id = gu.game_id AND gu.player_id = $1
                            WHERE g.winner_id = $1 AND g.status = 'finished'
                            GROUP BY g.id
                        ) as counts
                     )
                     WHERE user_id = $1`,
                    [userId]
                );
            }

            // Update fastest win
            if (isWinner && duration) {
                await pool.query(
                    `UPDATE player_stats 
                     SET fastest_win = LEAST(COALESCE(fastest_win, $2), $2)
                     WHERE user_id = $1`,
                    [userId, duration]
                );
            }

            await pool.query(
                'UPDATE player_stats SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
                [userId]
            );
        },

        /**
         * Get detailed game history with filters
         */
        async getGameHistory(userId, filters = {}) {
            const { gameType, opponent, limit = 20, offset = 0 } = filters;

            let query = `
                SELECT g.*,
                       u1.username as player1_username,
                       u2.username as player2_username,
                       COUNT(gu.id) as total_guesses,
                       CASE WHEN g.winner_id = $1 THEN 'win' ELSE 'loss' END as result
                FROM games g
                LEFT JOIN users u1 ON g.player1_id = u1.id
                LEFT JOIN users u2 ON g.player2_id = u2.id
                LEFT JOIN guesses gu ON g.id = gu.game_id
                WHERE (g.player1_id = $1 OR g.player2_id = $1) AND g.status = 'finished'
            `;

            const params = [userId];
            let paramIndex = 2;

            if (gameType === 'pvp') {
                query += ` AND g.is_ai = FALSE AND NOT EXISTS (
                    SELECT 1 FROM tournament_matches tm WHERE tm.game_id = g.id
                )`;
            } else if (gameType === 'ai') {
                query += ` AND g.is_ai = TRUE`;
            } else if (gameType === 'tournament') {
                query += ` AND EXISTS (
                    SELECT 1 FROM tournament_matches tm WHERE tm.game_id = g.id
                )`;
            }

            if (opponent) {
                query += ` AND (u1.username = $${paramIndex} OR u2.username = $${paramIndex})`;
                params.push(opponent);
                paramIndex++;
            }

            query += ` GROUP BY g.id, u1.username, u2.username
                       ORDER BY g.created_at DESC
                       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows;
        }
    };
};
