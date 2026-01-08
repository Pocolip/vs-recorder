import { useState, useEffect, useCallback } from 'react';
import { gamePlanApi } from '../services/api';

/**
 * Custom hook for managing multiple game plans
 * @returns {Object} Game plans state and methods
 */
export const useGamePlans = () => {
  const [gamePlans, setGamePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGamePlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gamePlanApi.getAll();
      setGamePlans(data || []);
    } catch (err) {
      console.error('Failed to load game plans:', err);
      setError(err.message || 'Failed to load game plans');
      setGamePlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGamePlans();
  }, [fetchGamePlans]);

  const createGamePlan = async (data) => {
    try {
      const newPlan = await gamePlanApi.create(data);
      setGamePlans((prev) => [newPlan, ...prev]);
      return newPlan;
    } catch (err) {
      console.error('Failed to create game plan:', err);
      throw err;
    }
  };

  const updateGamePlan = async (id, updates) => {
    try {
      const updated = await gamePlanApi.update(id, updates);
      setGamePlans((prev) =>
        prev.map((plan) => (plan.id === id ? updated : plan))
      );
      return updated;
    } catch (err) {
      console.error('Failed to update game plan:', err);
      throw err;
    }
  };

  const deleteGamePlan = async (id) => {
    try {
      await gamePlanApi.delete(id);
      setGamePlans((prev) => prev.filter((plan) => plan.id !== id));
    } catch (err) {
      console.error('Failed to delete game plan:', err);
      throw err;
    }
  };

  return {
    gamePlans,
    loading,
    error,
    createGamePlan,
    updateGamePlan,
    deleteGamePlan,
    refetch: fetchGamePlans,
    hasGamePlans: gamePlans.length > 0,
    isEmpty: gamePlans.length === 0 && !loading,
  };
};

export default useGamePlans;
