/**
 * Dignifiables System
 * Awards special badges for notable achievements
 */

const DIGNIFIABLE_TYPES = {
    TOURNAMENT_WINNER: 'tournament_winner',
    PERFECT_GAME: 'perfect_game',
    SPEED_DEMON: 'speed_demon',
    COMEBACK_KING: 'comeback_king',
    STREAK_MASTER: 'streak_master',
    AI_DESTROYER: 'ai_destroyer'
};

const DIGNIFIABLE_INFO = {
    tournament_winner: {
        name: 'Tournament Champion',
        icon: '🏆',
        description: 'Won a tournament'
    },
    perfect_game: {
        name: 'Perfect Victory',
        icon: '💎',
        description: 'Won without opponent guessing correctly'
    },
    speed_demon: {
        name: 'Speed Demon',
        icon: '⚡',
        description: 'Won in under 2 minutes'
    },
    comeback_king: {
        name: 'Comeback King',
        icon: '👑',
        description: 'Won after opponent had 2+ correct guesses'
    },
    streak_master: {
        name: 'Streak Master',
        icon: '🔥',
        description: 'Achieved 10 win streak'
    },
    ai_destroyer: {
        name: 'AI Destroyer',
        icon: '🤖',
        description: 'Beat Hard AI 10 times'
    }
};

/**
 * Check and award dignifiables after a game
 */
async function checkDignifiables(db, game, winnerId, guesses) {
    const dignifiables = [];

    // Perfect Game - opponent never guessed correctly
    const opponentId = game.player1_id === winnerId ? game.player2_id : game.player1_id;
    const opponentGuesses = guesses.filter(g => g.player_id === opponentId);

    // Only award if opponent actually played (made at least one guess)
    if (opponentGuesses.length > 0) {
        const opponentCorrect = opponentGuesses.filter(g => g.dead > 0 || g.wounded > 0);

        if (opponentCorrect.length === 0) {
            await db.userOps.awardDignifiable(winnerId, DIGNIFIABLE_TYPES.PERFECT_GAME, game.id);
            dignifiables.push(DIGNIFIABLE_INFO.perfect_game);
        }

        // Comeback King - won after opponent had 2+ correct guesses
        if (opponentCorrect.length >= 2) {
            await db.userOps.awardDignifiable(winnerId, DIGNIFIABLE_TYPES.COMEBACK_KING, game.id);
            dignifiables.push(DIGNIFIABLE_INFO.comeback_king);
        }
    }

    // Speed Demon - won in under 2 minutes
    // Use game end time (when winner was set) vs created time
    if (game.created_at) {
        const now = Date.now();
        const gameStart = new Date(game.created_at).getTime();
        const duration = now - gameStart;

        if (duration < 120000) { // 2 minutes in ms
            await db.userOps.awardDignifiable(winnerId, DIGNIFIABLE_TYPES.SPEED_DEMON, game.id);
            dignifiables.push(DIGNIFIABLE_INFO.speed_demon);
        }
    }

    // Streak Master - check current streak
    const user = await db.userOps.findById(winnerId);
    if (user.win_streak >= 10) {
        const hasStreak = await db.userOps.hasDignifiable(winnerId, DIGNIFIABLE_TYPES.STREAK_MASTER);
        if (!hasStreak) {
            await db.userOps.awardDignifiable(winnerId, DIGNIFIABLE_TYPES.STREAK_MASTER, null, null, { streak: user.win_streak });
            dignifiables.push(DIGNIFIABLE_INFO.streak_master);
        }
    }

    // AI Destroyer - beat Hard AI 10 times
    if (game.is_ai && game.ai_difficulty === 'hard') {
        const hardAIWins = await db.pool.query(
            `SELECT COUNT(*) as count FROM games 
             WHERE winner_id = $1 AND is_ai = TRUE AND ai_difficulty = 'hard' AND status = 'finished'`,
            [winnerId]
        );

        if (parseInt(hardAIWins.rows[0].count) >= 10) {
            const hasDestroyer = await db.userOps.hasDignifiable(winnerId, DIGNIFIABLE_TYPES.AI_DESTROYER);
            if (!hasDestroyer) {
                await db.userOps.awardDignifiable(winnerId, DIGNIFIABLE_TYPES.AI_DESTROYER);
                dignifiables.push(DIGNIFIABLE_INFO.ai_destroyer);
            }
        }
    }

    return dignifiables;
}

/**
 * Award tournament winner dignifiable
 */
async function awardTournamentWinner(db, tournamentId, winnerId) {
    await db.userOps.awardDignifiable(winnerId, DIGNIFIABLE_TYPES.TOURNAMENT_WINNER, null, tournamentId);
    return DIGNIFIABLE_INFO.tournament_winner;
}

module.exports = {
    DIGNIFIABLE_TYPES,
    DIGNIFIABLE_INFO,
    checkDignifiables,
    awardTournamentWinner
};
