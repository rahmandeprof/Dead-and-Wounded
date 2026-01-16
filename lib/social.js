/**
 * Social Operations
 * Friend system and challenges
 */

module.exports = function (pool) {
    return {
        /**
         * Send friend request
         */
        async sendFriendRequest(userId, friendId) {
            // Check if friendship already exists
            const existing = await pool.query(
                'SELECT * FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
                [userId, friendId]
            );

            if (existing.rows.length > 0) {
                throw new Error('Friendship already exists or pending');
            }

            await pool.query(
                'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
                [userId, friendId, 'pending']
            );
        },

        /**
         * Accept friend request
         */
        async acceptFriendRequest(userId, friendId) {
            await pool.query(
                `UPDATE friendships 
                 SET status = 'accepted' 
                 WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
                [friendId, userId]
            );
        },

        /**
         * Reject friend request
         */
        async rejectFriendRequest(userId, friendId) {
            await pool.query(
                'DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = $3',
                [friendId, userId, 'pending']
            );
        },

        /**
         * Remove friend
         */
        async removeFriend(userId, friendId) {
            await pool.query(
                'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
                [userId, friendId]
            );
        },

        /**
         * Get friends list
         */
        async getFriends(userId) {
            const result = await pool.query(
                `SELECT u.id, u.username, u.level, u.wins, u.losses, f.status, f.created_at
                 FROM friendships f
                 JOIN users u ON (
                    CASE 
                        WHEN f.user_id = $1 THEN f.friend_id
                        ELSE f.user_id
                    END = u.id
                 )
                 WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
                 ORDER BY u.username`,
                [userId]
            );
            return result.rows;
        },

        /**
         * Get pending friend requests
         */
        async getPendingRequests(userId) {
            const result = await pool.query(
                `SELECT u.id, u.username, u.level, f.created_at
                 FROM friendships f
                 JOIN users u ON f.user_id = u.id
                 WHERE f.friend_id = $1 AND f.status = 'pending'
                 ORDER BY f.created_at DESC`,
                [userId]
            );
            return result.rows;
        },

        /**
         * Send challenge
         */
        async sendChallenge(challengerId, challengedId, timeControlSeconds = null) {
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            const result = await pool.query(
                `INSERT INTO challenges (challenger_id, challenged_id, time_control_seconds, expires_at)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [challengerId, challengedId, timeControlSeconds, expiresAt]
            );

            return result.rows[0].id;
        },

        /**
         * Accept challenge
         */
        async acceptChallenge(challengeId) {
            const result = await pool.query(
                'SELECT * FROM challenges WHERE id = $1 AND status = $2',
                [challengeId, 'pending']
            );

            if (result.rows.length === 0) {
                throw new Error('Challenge not found or already accepted');
            }

            return result.rows[0];
        },

        /**
         * Link game to challenge
         */
        async linkGameToChallenge(challengeId, gameId) {
            await pool.query(
                `UPDATE challenges 
                 SET game_id = $1, status = 'accepted'
                 WHERE id = $2`,
                [gameId, challengeId]
            );
        },

        /**
         * Decline challenge
         */
        async declineChallenge(challengeId) {
            await pool.query(
                `UPDATE challenges 
                 SET status = 'declined'
                 WHERE id = $1`,
                [challengeId]
            );
        },

        /**
         * Get pending challenges for user
         */
        async getPendingChallenges(userId) {
            const result = await pool.query(
                `SELECT c.*, u.username as challenger_username
                 FROM challenges c
                 JOIN users u ON c.challenger_id = u.id
                 WHERE c.challenged_id = $1 AND c.status = 'pending'
                   AND c.expires_at > CURRENT_TIMESTAMP
                 ORDER BY c.created_at DESC`,
                [userId]
            );
            return result.rows;
        },

        /**
         * Clean up expired challenges
         */
        async cleanupExpiredChallenges() {
            await pool.query(
                `UPDATE challenges 
                 SET status = 'expired'
                 WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP`
            );
        }
    };
};
