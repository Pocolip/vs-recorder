// src/services/ReplayProcessor.js - Background replay processing

import { ReplayService } from './ReplayService';
import { StorageService } from './StorageService';

class ReplayProcessor {
    constructor() {
        this.processingQueue = new Map(); // replayId -> Promise
        this.maxConcurrent = 3; // Maximum concurrent requests to Showdown
        this.currentlyProcessing = 0;
        this.requestDelay = 250; // Delay between requests in ms
    }

    /**
     * Adds replay entries immediately and starts background processing
     * @param {string[]} urls - Array of replay URLs
     * @param {string} teamId - Team ID
     * @param {string} notes - Shared notes
     * @param {Function} onProgress - Progress callback (replayId, status, data)
     * @returns {Promise<Object[]>} - Array of replay entries (without content initially)
     */
    async processReplays(urls, teamId, notes = '', onProgress = null) {
        const replayEntries = [];

        // Step 1: Create all replay entries immediately
        for (const url of urls) {
            try {
                const entry = ReplayService.createReplayEntry(url, teamId, notes);
                await StorageService.addReplay(entry);
                replayEntries.push(entry);

                if (onProgress) {
                    onProgress(entry.id, 'created', entry);
                }
            } catch (error) {
                console.error(`Failed to create entry for ${url}:`, error);
                if (onProgress) {
                    onProgress(null, 'error', { url, error: error.message });
                }
            }
        }

        // Step 2: Start background processing
        this.startBackgroundProcessing(replayEntries, onProgress);

        return replayEntries;
    }

    /**
     * Starts processing replays in the background with rate limiting
     * @param {Object[]} replayEntries - Replay entries to process
     * @param {Function} onProgress - Progress callback
     */
    startBackgroundProcessing(replayEntries, onProgress = null) {
        for (const entry of replayEntries) {
            // Add to processing queue if not already processing
            if (!this.processingQueue.has(entry.id)) {
                const processingPromise = this.processReplayWhenSlotAvailable(entry, onProgress);
                this.processingQueue.set(entry.id, processingPromise);
            }
        }
    }

    /**
     * Processes a single replay when a processing slot becomes available
     * @param {Object} replayEntry - Replay entry to process
     * @param {Function} onProgress - Progress callback
     */
    async processReplayWhenSlotAvailable(replayEntry, onProgress = null) {
        // Wait for an available processing slot
        await this.waitForProcessingSlot();

        this.currentlyProcessing++;

        try {
            // Update status to loading
            await StorageService.updateReplayStatus(replayEntry.id, { status: 'loading' });

            if (onProgress) {
                onProgress(replayEntry.id, 'loading', replayEntry);
            }

            // Add delay to be respectful to Showdown's servers
            await this.delay(this.requestDelay);

            // Fetch and parse the replay content
            const updatedEntry = await ReplayService.fetchReplayContent(replayEntry);

            // Save the updated entry
            await StorageService.updateReplayStatus(replayEntry.id, updatedEntry);

            if (onProgress) {
                onProgress(replayEntry.id, updatedEntry.status, updatedEntry);
            }

        } catch (error) {
            console.error(`Failed to process replay ${replayEntry.id}:`, error);

            // Update with error status
            const errorUpdate = {
                status: 'error',
                error: error.message,
                lastUpdated: new Date().toISOString()
            };

            await StorageService.updateReplayStatus(replayEntry.id, errorUpdate);

            if (onProgress) {
                onProgress(replayEntry.id, 'error', { ...replayEntry, ...errorUpdate });
            }
        } finally {
            this.currentlyProcessing--;
            this.processingQueue.delete(replayEntry.id);
        }
    }

    /**
     * Waits for a processing slot to become available
     */
    async waitForProcessingSlot() {
        while (this.currentlyProcessing >= this.maxConcurrent) {
            await this.delay(100); // Check every 100ms
        }
    }

    /**
     * Retry processing for failed replays
     * @param {string} replayId - Replay ID to retry
     * @param {Function} onProgress - Progress callback
     */
    async retryReplay(replayId, onProgress = null) {
        const replay = await StorageService.getReplay(replayId);

        if (!replay) {
            throw new Error('Replay not found');
        }

        if (replay.status === 'loading') {
            throw new Error('Replay is already being processed');
        }

        // Reset status and retry
        const resetEntry = { ...replay, status: 'pending', error: null };
        await StorageService.updateReplayStatus(replayId, resetEntry);

        await this.processReplayWhenSlotAvailable(resetEntry, onProgress);
    }

    /**
     * Get processing status for all replays
     * @param {string} teamId - Team ID to check
     * @returns {Object} - Processing status summary
     */
    async getProcessingStatus(teamId) {
        const replays = await StorageService.getReplaysForTeam(teamId);
        const replayArray = Object.values(replays);

        const status = {
            total: replayArray.length,
            pending: 0,
            loading: 0,
            completed: 0,
            error: 0
        };

        for (const replay of replayArray) {
            // Handle legacy replays that might not have a status field
            const replayStatus = replay.status || (replay.parsedData ? 'completed' : 'pending');

            if (status[replayStatus] !== undefined) {
                status[replayStatus]++;
            } else {
                // Default unknown status to completed if it has parsed data
                if (replay.parsedData) {
                    status.completed++;
                } else {
                    status.pending++;
                }
            }
        }

        return status;
    }

    /**
     * Cancel all pending processing for a team
     * @param {string} teamId - Team ID
     */
    async cancelProcessing(teamId) {
        const replays = await StorageService.getReplaysForTeam(teamId);

        for (const [replayId, replay] of Object.entries(replays)) {
            if (replay.status === 'pending' || replay.status === 'loading') {
                // Remove from processing queue
                this.processingQueue.delete(replayId);

                // Update status to cancelled
                await StorageService.updateReplayStatus(replayId, {
                    status: 'error',
                    error: 'Processing cancelled by user'
                });
            }
        }
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current processing statistics
     */
    getProcessingStats() {
        return {
            currentlyProcessing: this.currentlyProcessing,
            queueSize: this.processingQueue.size,
            maxConcurrent: this.maxConcurrent
        };
    }
}

// Create singleton instance
const replayProcessor = new ReplayProcessor();

// Export both named and default
export { replayProcessor as ReplayProcessor, ReplayProcessor as ReplayProcessorClass };
export default replayProcessor;