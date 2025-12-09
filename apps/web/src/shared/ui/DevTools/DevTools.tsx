import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { fetchSubscription } from '@/store/slices/subscriptionSlice';
import { config } from '@/shared/config/env';

const PLANS = ['START', 'TEAM', 'BUSINESS'];

export const DevTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('START');
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const currentPlan = useAppSelector((state) => state.subscription?.data?.plan);

  const handleApply = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${config.apiUrl}/dev/set-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        throw new Error('Failed to set plan');
      }

      // Reload subscription to update UI
      await dispatch(fetchSubscription());
      alert(`Plan switched to ${selectedPlan}`);
    } catch (error) {
      console.error('Failed to switch plan:', error);
      alert('Failed to switch plan');
    } finally {
      setLoading(false);
    }
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-full shadow-lg z-50 text-xs font-mono hover:bg-gray-700 transition"
      >
        DEV
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Dev Tools
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Current Plan:{' '}
            <span className="font-bold text-primary-600">
              {currentPlan || '-'}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Force Plan
          </label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleApply}
          disabled={loading}
          className="w-full bg-primary-600 text-white py-1.5 rounded text-xs font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Applying...' : 'Apply Plan'}
        </button>
      </div>
    </div>
  );
};
