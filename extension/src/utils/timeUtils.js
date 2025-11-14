// src/utils/timeUtils.js

/**
 * Format a date string into a human-readable "time ago" format
 * @param {string} dateString - ISO date string
 * @returns {string} Human-readable time difference (e.g., "2h ago", "3d ago")
 */
export const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;

    // Handle invalid dates
    if (isNaN(date.getTime())) {
        return 'Unknown';
    }

    // Handle future dates (shouldn't happen but good to be safe)
    if (diffInMs < 0) {
        return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    // Less than 1 minute
    if (diffInMinutes < 1) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diffInHours < 1) {
        return `${diffInMinutes}m ago`;
    }

    // Less than 24 hours
    if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }

    // Less than 7 days
    if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    }

    // Less than 4 weeks
    if (diffInWeeks < 4) {
        return `${diffInWeeks}w ago`;
    }

    // Less than 12 months
    if (diffInMonths < 12) {
        return `${diffInMonths}mo ago`;
    }

    // 1 year or more
    return `${diffInYears}y ago`;
};

/**
 * Format a date string into a more detailed readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2025 at 2:30 PM")
 */
export const formatFullDate = (dateString) => {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Format a date string into a short date format
 * @param {string} dateString - ISO date string
 * @returns {string} Short formatted date (e.g., "Jan 15, 2025")
 */
export const formatShortDate = (dateString) => {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Check if a date is within the last N days
 * @param {string} dateString - ISO date string
 * @param {number} days - Number of days to check
 * @returns {boolean} True if date is within the last N days
 */
export const isWithinLastDays = (dateString, days) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    return diffInDays <= days && diffInDays >= 0;
};

/**
 * Get relative time category for grouping
 * @param {string} dateString - ISO date string
 * @returns {string} Category like 'today', 'yesterday', 'this-week', 'this-month', 'older'
 */
export const getTimeCategory = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays <= 7) return 'this-week';
    if (diffInDays <= 30) return 'this-month';
    return 'older';
};