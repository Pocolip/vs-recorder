import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '@/services/api';
import { useToast } from '@/contexts';

/**
 * Custom hook for fetching team analytics data
 * @param {number} teamId - Team ID
 * @param {string} type - Analytics type: 'usage' | 'matchups' | 'moves'
 * @returns {Object} Analytics data and loading state
 */
export const useAnalytics = (teamId, type) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  const fetchAnalytics = useCallback(async () => {
    if (!teamId || !type) return;

    try {
      setLoading(true);
      let result;

      switch (type) {
        case 'usage':
          result = await analyticsApi.getUsageStats(teamId);
          break;
        case 'matchups':
          result = await analyticsApi.getMatchupStats(teamId);
          break;
        case 'moves':
          result = await analyticsApi.getMoveStats(teamId);
          break;
        default:
          throw new Error(`Unknown analytics type: ${type}`);
      }

      setData(result);
    } catch (err) {
      console.error(`Error fetching ${type} analytics:`, err);
      showError(`Failed to load ${type} statistics.`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, type, showError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    refetch: fetchAnalytics,
  };
};

/**
 * Custom hook for fetching custom matchup analysis
 * @param {number} teamId - Team ID
 * @returns {Object} Custom matchup analysis function and state
 */
export const useCustomMatchup = (teamId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  /**
   * Analyze matchup against specific opponent Pokemon
   * @param {string[]} opponentPokemon - Array of opponent Pokemon names
   */
  const analyzeMatchup = async (opponentPokemon) => {
    if (!teamId || !opponentPokemon || opponentPokemon.length === 0) {
      return;
    }

    try {
      setLoading(true);
      const result = await analyticsApi.getCustomMatchup(teamId, opponentPokemon);
      setData(result);
      return result;
    } catch (err) {
      console.error('Error analyzing custom matchup:', err);
      showError('Failed to analyze matchup.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    analyzeMatchup,
  };
};

export default useAnalytics;
