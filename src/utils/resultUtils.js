// src/utils/resultUtils.js

/**
 * Get display information for a battle result
 * @param {string|null} result - The battle result ('win', 'loss', or null/undefined)
 * @returns {Object} Display object with text and className for styling
 */
export const getResultDisplay = (result) => {
    if (!result) {
        return {
            text: 'UNKNOWN',
            className: 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
        };
    }

    switch (result.toLowerCase()) {
        case 'win':
            return {
                text: 'WIN',
                className: 'bg-green-600/20 text-green-400 border border-green-600/30'
            };
        case 'loss':
        case 'lose':
            return {
                text: 'LOSS',
                className: 'bg-red-600/20 text-red-400 border border-red-600/30'
            };
        default:
            return {
                text: 'UNKNOWN',
                className: 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
            };
    }
};

/**
 * Get result text only (without styling)
 * @param {string|null} result - The battle result
 * @returns {string} Human-readable result text
 */
export const getResultText = (result) => {
    return getResultDisplay(result).text;
};

/**
 * Get result styling classes only
 * @param {string|null} result - The battle result
 * @returns {string} CSS classes for styling the result
 */
export const getResultClassName = (result) => {
    return getResultDisplay(result).className;
};

/**
 * Check if a result represents a win
 * @param {string|null} result - The battle result
 * @returns {boolean} True if the result is a win
 */
export const isWin = (result) => {
    return result && result.toLowerCase() === 'win';
};

/**
 * Check if a result represents a loss
 * @param {string|null} result - The battle result
 * @returns {boolean} True if the result is a loss
 */
export const isLoss = (result) => {
    return result && ['loss', 'lose'].includes(result.toLowerCase());
};

/**
 * Check if a result is unknown/undefined
 * @param {string|null} result - The battle result
 * @returns {boolean} True if the result is unknown
 */
export const isUnknownResult = (result) => {
    return !result || !['win', 'loss', 'lose'].includes(result.toLowerCase());
};

/**
 * Get the opposite result (useful for opponent perspective)
 * @param {string|null} result - The battle result
 * @returns {string|null} The opposite result, or null if unknown
 */
export const getOppositeResult = (result) => {
    if (isWin(result)) return 'loss';
    if (isLoss(result)) return 'win';
    return null;
};

/**
 * Calculate win rate from an array of results
 * @param {Array<string|null>} results - Array of battle results
 * @returns {number} Win rate as a percentage (0-100)
 */
export const calculateWinRate = (results) => {
    if (!results || results.length === 0) return 0;

    const wins = results.filter(isWin).length;
    return Math.round((wins / results.length) * 100);
};

/**
 * Count results by type
 * @param {Array<string|null>} results - Array of battle results
 * @returns {Object} Object with counts for wins, losses, and unknown
 */
export const countResults = (results) => {
    if (!results || results.length === 0) {
        return { wins: 0, losses: 0, unknown: 0, total: 0 };
    }

    const wins = results.filter(isWin).length;
    const losses = results.filter(isLoss).length;
    const unknown = results.filter(isUnknownResult).length;

    return {
        wins,
        losses,
        unknown,
        total: results.length
    };
};

/**
 * Get result statistics with win rate
 * @param {Array<string|null>} results - Array of battle results
 * @returns {Object} Comprehensive result statistics
 */
export const getResultStats = (results) => {
    const counts = countResults(results);
    const winRate = calculateWinRate(results);

    return {
        ...counts,
        winRate
    };
};