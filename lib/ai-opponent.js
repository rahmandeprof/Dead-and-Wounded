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
     * Hard AI: Optimal strategy using information theory
     * Chooses guess that maximizes expected information gain
     */
    hardGuess(previousGuesses) {
        if (previousGuesses.length === 0) {
            // Optimal first guess based on information theory
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
            return this.easyGuess();
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        // Calculate expected information for each possible guess
        let bestGuess = candidates[0];
        let maxExpectedInfo = -1;

        // Sample a subset for performance (checking all would be too slow)
        const guessesToCheck = candidates.length > 100
            ? this.sampleArray(candidates, 100)
            : candidates;

        for (const guess of guessesToCheck) {
            const expectedInfo = this.calculateExpectedInformation(guess, candidates);
            if (expectedInfo > maxExpectedInfo) {
                maxExpectedInfo = expectedInfo;
                bestGuess = guess;
            }
        }

        return bestGuess;
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
