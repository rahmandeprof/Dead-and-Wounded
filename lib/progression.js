// Progression System Utilities

// Level calculation from XP
function getLevelFromXP(xp) {
    let level = 1;
    let xpNeeded = 0;
    let increment = 100;

    while (xp >= xpNeeded + increment) {
        xpNeeded += increment;
        level++;
        increment += 100;
    }

    return {
        level,
        currentLevelXP: xp - xpNeeded,
        nextLevelXP: increment,
        totalXPForNextLevel: xpNeeded + increment
    };
}

// XP calculation based on game outcome
function calculateXP(game, winnerId, userId, aiDifficulty = null) {
    const isWinner = winnerId === userId;

    // AI games
    if (game.is_ai) {
        if (isWinner) {
            switch (aiDifficulty) {
                case 'hard': return 150;
                case 'medium': return 100;
                case 'easy': return 50;
                default: return 100;
            }
        }
        return 20; // Loss participation XP
    }

    // Practice mode
    if (game.is_practice) {
        return 10;
    }

    // PvP games
    return isWinner ? 100 : 20;
}

// Achievement definitions
const ACHIEVEMENTS = {
    FIRST_WIN: {
        type: 'first_win',
        name: 'Beginner\'s Luck',
        icon: '🍀',
        description: 'Win your first game'
    },
    TEN_WINS: {
        type: 'ten_wins',
        name: 'Rising Star',
        icon: '⭐',
        description: 'Win 10 games'
    },
    FIFTY_WINS: {
        type: 'fifty_wins',
        name: 'Veteran',
        icon: '🎖️',
        description: 'Win 50 games'
    },
    HUNDRED_WINS: {
        type: 'hundred_wins',
        name: 'Master',
        icon: '👑',
        description: 'Win 100 games'
    },
    STREAK_FIVE: {
        type: 'streak_five',
        name: 'On Fire',
        icon: '🔥',
        description: 'Win 5 games in a row'
    },
    STREAK_TEN: {
        type: 'streak_ten',
        name: 'Unstoppable',
        icon: '⚡',
        description: 'Win 10 games in a row'
    },
    AI_SLAYER: {
        type: 'ai_slayer',
        name: 'AI Slayer',
        icon: '🤖',
        description: 'Beat Hard AI'
    },
    LEVEL_TEN: {
        type: 'level_ten',
        name: 'Experienced',
        icon: '📈',
        description: 'Reach level 10'
    },
    LEVEL_TWENTY: {
        type: 'level_twenty',
        name: 'Elite',
        icon: '💎',
        description: 'Reach level 20'
    },
    LEVEL_THIRTY: {
        type: 'level_thirty',
        name: 'Legend',
        icon: '🏆',
        description: 'Reach level 30'
    }
};

// Check which achievements to unlock
async function checkAchievements(db, userId, game, winnerId) {
    const user = await db.userOps.findById(userId);
    const unlocked = [];

    // First win
    if (user.wins === 1 && winnerId === userId) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.FIRST_WIN.type);
        if (success) unlocked.push(ACHIEVEMENTS.FIRST_WIN);
    }

    // Win milestones
    if (user.wins === 10) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.TEN_WINS.type);
        if (success) unlocked.push(ACHIEVEMENTS.TEN_WINS);
    }
    if (user.wins === 50) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.FIFTY_WINS.type);
        if (success) unlocked.push(ACHIEVEMENTS.FIFTY_WINS);
    }
    if (user.wins === 100) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.HUNDRED_WINS.type);
        if (success) unlocked.push(ACHIEVEMENTS.HUNDRED_WINS);
    }

    // Win streaks
    if (user.win_streak === 5) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.STREAK_FIVE.type);
        if (success) unlocked.push(ACHIEVEMENTS.STREAK_FIVE);
    }
    if (user.win_streak === 10) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.STREAK_TEN.type);
        if (success) unlocked.push(ACHIEVEMENTS.STREAK_TEN);
    }

    // AI Slayer
    if (game.is_ai && game.ai_difficulty === 'hard' && winnerId === userId) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.AI_SLAYER.type);
        if (success) unlocked.push(ACHIEVEMENTS.AI_SLAYER);
    }

    // Level milestones
    if (user.level === 10) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_TEN.type);
        if (success) unlocked.push(ACHIEVEMENTS.LEVEL_TEN);
    }
    if (user.level === 20) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_TWENTY.type);
        if (success) unlocked.push(ACHIEVEMENTS.LEVEL_TWENTY);
    }
    if (user.level === 30) {
        const success = await db.userOps.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_THIRTY.type);
        if (success) unlocked.push(ACHIEVEMENTS.LEVEL_THIRTY);
    }

    return unlocked;
}

// Title unlocks by level
const TITLE_UNLOCKS = {
    5: 'Apprentice',
    10: 'Skilled',
    15: 'Expert',
    20: 'Master',
    25: 'Grandmaster',
    30: 'Legend'
};

// Profile color unlocks by level
const COLOR_UNLOCKS = {
    1: '#6366f1',   // Indigo
    5: '#a855f7',   // Purple
    10: '#ec4899',  // Pink
    15: '#f97316',  // Orange
    20: '#eab308',  // Gold
    25: '#10b981',  // Emerald
    30: 'linear-gradient(90deg, #f97316, #eab308, #10b981, #6366f1, #a855f7, #ec4899)' // Rainbow
};

module.exports = {
    getLevelFromXP,
    calculateXP,
    ACHIEVEMENTS,
    checkAchievements,
    TITLE_UNLOCKS,
    COLOR_UNLOCKS
};
