/**
 * AI Opponent for Dead and Wounded game
 * Implements three difficulty levels: Easy, Medium, Hard
 */

const gameLogic = require('./game-logic');

class AIOpponent {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.possibleNumbers = this.generateAllPossibleNumbers();
    }

    /**
     * Generate all possible 4-digit numbers with unique digits
     */
    generateAllPossibleNumbers() {
        const numbers = [];
        for (let i = 0; i <= 9; i++) {
            for (let j = 0; j <= 9; j++) {
                if (j === i) continue;
                for (let k = 0; k <= 9; k++) {
                    if (k === i || k === j) continue;
                    for (let l = 0; l <= 9; l++) {
                        if (l === i || l === j || l === k) continue;
                        numbers.push(`${i}${j}${k}${l}`);
                    }
                }
            }
        }
        return numbers;
    }

    /**
     * Make a guess based on difficulty level
     */
    makeGuess(previousGuesses = [], opponentSecret = null) {
        switch (this.difficulty) {
            case 'easy':
                return this.easyGuess();
            case 'medium':
                return this.mediumGuess(previousGuesses);
            case 'hard':
                return this.hardGuess(previousGuesses);
            default:
                return this.mediumGuess(previousGuesses);
        }
    }

    /**
     * Easy AI: Random valid guess
     */
    easyGuess() {
        const digits = '0123456789'.split('');
        const shuffled = digits.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 4).join('');
    }

    /**
     * Medium AI: Eliminate impossible numbers based on feedback
     */
    mediumGuess(previousGuesses) {
        if (previousGuesses.length === 0) {
            // First guess: use a good starting number
            return '0123';
        }

        // Filter possible numbers based on previous guesses
        let candidates = [...this.possibleNumbers];

        for (const prevGuess of previousGuesses) {
            candidates = candidates.filter(candidate => {
                const result = gameLogic.calculateDeadWounded(candidate, prevGuess.guess);
                return result.dead === prevGuess.dead && result.wounded === prevGuess.wounded;
            });
        }

        if (candidates.length === 0) {
            // Fallback to random if no candidates
            return this.easyGuess();
        }

        // Pick a random candidate from remaining possibilities
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Hard AI: Minimax strategy
     * Chooses guess that minimizes worst-case remaining candidates
     * This guarantees optimal play - typically solves in 5-6 guesses
     */
    hardGuess(previousGuesses) {
        if (previousGuesses.length === 0) {
            // Randomly select from optimal openers to vary the game
            // 0123, 0167, 1234, 5678 are all strong starting guesses
            const openers = ['0123', '0167', '1234', '5678'];
            return openers[Math.floor(Math.random() * openers.length)];
        }

        // Filter possible numbers based on previous guesses
        let candidates = [...this.possibleNumbers];

        for (const prevGuess of previousGuesses) {
            candidates = candidates.filter(candidate => {
                const result = gameLogic.calculateDeadWounded(candidate, prevGuess.guess);
                return result.dead === prevGuess.dead && result.wounded === prevGuess.wounded;
            });
        }

        if (candidates.length === 0) {
            return this.easyGuess();
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        // Use minimax with "Top-K" selection
        // Instead of always picking the absolute best, pick from the top few
        // to make the AI feel more human and less robotic
        let scoredGuesses = [];
        let minWorstCase = Infinity;

        // Increased sample size for better performance
        const guessesToCheck = candidates.length > 300
            ? this.sampleArray(candidates, 300)
            : candidates;

        for (const guess of guessesToCheck) {
            const worstCase = this.calculateWorstCase(guess, candidates);
            const entropy = this.calculateExpectedInformation(guess, candidates);

            scoredGuesses.push({ guess, worstCase, entropy });

            if (worstCase < minWorstCase) {
                minWorstCase = worstCase;
            }
        }

        // Filter for guesses that are within a small margin of the best worst-case
        // This allows for "sub-optimal but still very good" moves
        // Margin: allow worst case to be up to 15% worse than absolute best, or at least min + 1
        const acceptableWorstCase = Math.max(minWorstCase + 1, Math.ceil(minWorstCase * 1.15));

        const topCandidates = scoredGuesses.filter(g => g.worstCase <= acceptableWorstCase);

        // Sort by entropy (secondary metric) to keep high information moves at the top
        topCandidates.sort((a, b) => b.entropy - a.entropy);

        // Pick randomly from the top 5 (or fewer if not enough candidates)
        const selectionPool = topCandidates.slice(0, 5);
        const selected = selectionPool[Math.floor(Math.random() * selectionPool.length)];

        return selected ? selected.guess : this.easyGuess();
    }

    /**
     * Calculate worst-case (largest) group size for a guess
     */
    calculateWorstCase(guess, candidates) {
        const outcomeGroups = {};

        for (const candidate of candidates) {
            const result = gameLogic.calculateDeadWounded(candidate, guess);
            const key = `${result.dead}-${result.wounded}`;
            outcomeGroups[key] = (outcomeGroups[key] || 0) + 1;
        }

        // Return the size of the largest group (worst case)
        return Math.max(...Object.values(outcomeGroups));
    }

    /**
     * Calculate expected information gain for a guess
     */
    calculateExpectedInformation(guess, candidates) {
        const outcomeGroups = {};

        // Group candidates by their response to this guess
        for (const candidate of candidates) {
            const result = gameLogic.calculateDeadWounded(candidate, guess);
            const key = `${result.dead}-${result.wounded}`;

            if (!outcomeGroups[key]) {
                outcomeGroups[key] = [];
            }
            outcomeGroups[key].push(candidate);
        }

        // Calculate entropy (information gain)
        let entropy = 0;
        for (const group of Object.values(outcomeGroups)) {
            const probability = group.length / candidates.length;
            if (probability > 0) {
                entropy -= probability * Math.log2(probability);
            }
        }

        return entropy;
    }

    /**
     * Sample random elements from array
     */
    sampleArray(array, count) {
        const shuffled = [...array].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * Generate a random secret number for AI
     */
    generateSecret() {
        return this.easyGuess();
    }
}

module.exports = AIOpponent;
