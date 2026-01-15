/**
 * Core game logic for Dead and Wounded
 * 
 * Dead = correct digit in correct position
 * Wounded = correct digit in wrong position
 */

/**
 * Validates a secret number or guess
 * Must be exactly 4 unique digits (0-9)
 * @param {string} number - The number to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateNumber(number) {
  // Must be a string of exactly 4 characters
  if (typeof number !== 'string' || number.length !== 4) {
    return { valid: false, error: 'Must be exactly 4 digits' };
  }

  // Must contain only digits 0-9
  if (!/^[0-9]{4}$/.test(number)) {
    return { valid: false, error: 'Must contain only digits 0-9' };
  }

  // Must have no repeated digits
  const digits = new Set(number.split(''));
  if (digits.size !== 4) {
    return { valid: false, error: 'Digits must be unique (no repetition)' };
  }

  return { valid: true };
}

/**
 * Calculates Dead and Wounded counts for a guess against a secret
 * @param {string} secret - The 4-digit secret number
 * @param {string} guess - The 4-digit guess
 * @returns {{dead: number, wounded: number}}
 */
function calculateDeadWounded(secret, guess) {
  let dead = 0;
  let wounded = 0;

  const secretDigits = secret.split('');
  const guessDigits = guess.split('');

  // First pass: count Dead (exact position matches)
  const deadPositions = new Set();
  for (let i = 0; i < 4; i++) {
    if (guessDigits[i] === secretDigits[i]) {
      dead++;
      deadPositions.add(i);
    }
  }

  // Second pass: count Wounded (digit exists but wrong position)
  for (let i = 0; i < 4; i++) {
    // Skip if this position was already counted as Dead
    if (deadPositions.has(i)) continue;

    // Check if this guess digit exists in the secret at a different position
    for (let j = 0; j < 4; j++) {
      if (deadPositions.has(j)) continue; // Skip dead positions in secret
      if (i !== j && guessDigits[i] === secretDigits[j]) {
        wounded++;
        break; // Only count once per guess digit
      }
    }
  }

  return { dead, wounded };
}

/**
 * Checks if a guess is a winning guess (4 Dead)
 * @param {number} dead - Number of dead
 * @returns {boolean}
 */
function isWinningGuess(dead) {
  return dead === 4;
}

/**
 * Generates a random valid secret number (for AI opponent)
 * @returns {string}
 */
function generateRandomSecret() {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  // Fisher-Yates shuffle
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  
  return digits.slice(0, 4).join('');
}

module.exports = {
  validateNumber,
  calculateDeadWounded,
  isWinningGuess,
  generateRandomSecret
};
