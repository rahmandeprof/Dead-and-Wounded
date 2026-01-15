/**
 * Unit tests for Dead and Wounded game logic
 * Run with: npm test
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
    validateNumber,
    calculateDeadWounded,
    isWinningGuess,
    generateRandomSecret
} = require('../lib/game-logic');

describe('validateNumber', () => {
    test('accepts valid 4-digit unique numbers', () => {
        const result = validateNumber('1234');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.error, undefined);
    });

    test('accepts numbers starting with 0', () => {
        const result = validateNumber('0123');
        assert.strictEqual(result.valid, true);
    });

    test('accepts all unique digits', () => {
        const result = validateNumber('9876');
        assert.strictEqual(result.valid, true);
    });

    test('rejects numbers with less than 4 digits', () => {
        const result = validateNumber('123');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error.includes('4 digits'));
    });

    test('rejects numbers with more than 4 digits', () => {
        const result = validateNumber('12345');
        assert.strictEqual(result.valid, false);
    });

    test('rejects numbers with repeated digits', () => {
        const result = validateNumber('1123');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error.includes('unique'));
    });

    test('rejects all same digits', () => {
        const result = validateNumber('1111');
        assert.strictEqual(result.valid, false);
    });

    test('rejects non-numeric characters', () => {
        const result = validateNumber('12ab');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error.includes('digits'));
    });

    test('rejects empty string', () => {
        const result = validateNumber('');
        assert.strictEqual(result.valid, false);
    });

    test('rejects non-string input', () => {
        const result = validateNumber(1234);
        assert.strictEqual(result.valid, false);
    });
});

describe('calculateDeadWounded', () => {
    test('returns 0 Dead, 0 Wounded for no matches', () => {
        const result = calculateDeadWounded('1234', '5678');
        assert.deepStrictEqual(result, { dead: 0, wounded: 0 });
    });

    test('returns 4 Dead for exact match', () => {
        const result = calculateDeadWounded('1234', '1234');
        assert.deepStrictEqual(result, { dead: 4, wounded: 0 });
    });

    test('returns correct Dead for partial position matches', () => {
        const result = calculateDeadWounded('1234', '1567');
        assert.strictEqual(result.dead, 1);
        assert.strictEqual(result.wounded, 0);
    });

    test('returns correct Wounded for correct digits wrong positions', () => {
        const result = calculateDeadWounded('1234', '4321');
        assert.strictEqual(result.dead, 0);
        assert.strictEqual(result.wounded, 4);
    });

    test('example from requirements: secret 1743, guess 3854', () => {
        const result = calculateDeadWounded('1743', '3854');
        assert.deepStrictEqual(result, { dead: 0, wounded: 2 });
    });

    test('example from requirements: secret 1743, guess 3845', () => {
        const result = calculateDeadWounded('1743', '3845');
        assert.deepStrictEqual(result, { dead: 1, wounded: 1 });
    });

    test('mixed Dead and Wounded', () => {
        const result = calculateDeadWounded('1234', '1324');
        assert.strictEqual(result.dead, 2); // 1 and 4 in correct positions
        assert.strictEqual(result.wounded, 2); // 2 and 3 in wrong positions
    });

    test('does not double count Dead as Wounded', () => {
        const result = calculateDeadWounded('1234', '1243');
        assert.strictEqual(result.dead, 2); // 1 and 2
        assert.strictEqual(result.wounded, 2); // 4 and 3
    });

    test('handles leading zeros in secret', () => {
        const result = calculateDeadWounded('0123', '0456');
        assert.strictEqual(result.dead, 1);
        assert.strictEqual(result.wounded, 0);
    });

    test('handles leading zeros in guess', () => {
        const result = calculateDeadWounded('1234', '0234');
        assert.strictEqual(result.dead, 3);
        assert.strictEqual(result.wounded, 0);
    });
});

describe('isWinningGuess', () => {
    test('returns true for 4 Dead', () => {
        assert.strictEqual(isWinningGuess(4), true);
    });

    test('returns false for less than 4 Dead', () => {
        assert.strictEqual(isWinningGuess(0), false);
        assert.strictEqual(isWinningGuess(1), false);
        assert.strictEqual(isWinningGuess(2), false);
        assert.strictEqual(isWinningGuess(3), false);
    });
});

describe('generateRandomSecret', () => {
    test('generates a valid 4-digit number', () => {
        for (let i = 0; i < 10; i++) {
            const secret = generateRandomSecret();
            const validation = validateNumber(secret);
            assert.strictEqual(validation.valid, true, `Generated invalid secret: ${secret}`);
        }
    });

    test('generates different secrets (usually)', () => {
        const secrets = new Set();
        for (let i = 0; i < 20; i++) {
            secrets.add(generateRandomSecret());
        }
        // With 5040 possible combinations, 20 tries should give multiple unique values
        assert.ok(secrets.size > 1, 'Generated secrets should vary');
    });
});
