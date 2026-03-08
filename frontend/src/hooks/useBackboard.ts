import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

// We'll mock the actual API call since we don't know the exact Backboard REST structure, 
// but we'll simulate the stateful storage mechanism using localStorage combined with a mock fetch.
export interface UserLifestyle {
  commuteType: 'Public Transit' | 'Car';
  dietaryFocus: 'Budget' | 'Health' | 'Family';
  workLocation: string;
  university?: string;
  livesAlone: boolean;
  isStudent: boolean;
}

export interface UserPreferences {
  budget: number;
  cities: string[];
  lifestyle: UserLifestyle;
}

export const useBackboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flaggedListings, setFlaggedListings] = useState<string[]>([]);
  const [vaultStatus, setVaultStatus] = useState<Record<string, boolean>>({});

  // Load flags and vault status on mount
  useEffect(() => {
    const flags = localStorage.getItem('backboard_global_flags');
    if (flags) {
      setFlaggedListings(JSON.parse(flags));
    }
    const storedVault = localStorage.getItem('canAfford_vault');
    if (storedVault) {
      setVaultStatus(JSON.parse(storedVault));
    }
  }, []);

  const initializeThread = useCallback(async (userId: string) => {
    // MOCK: In a real implementation this would create or fetch a Backboard.io stateful Thread
    const saved = localStorage.getItem(`backboard_prefs_${userId}`);
    if (!saved) {
      // Default preferences
      localStorage.setItem(`backboard_prefs_${userId}`, JSON.stringify({ 
        budget: 1500, 
        cities: ['Toronto'],
        lifestyle: { commuteType: 'Public Transit', dietaryFocus: 'Budget', workLocation: 'Toronto', university: 'University of Toronto', livesAlone: true, isStudent: false }
      }));
    }
  }, []);

  const saveUserBudget = useCallback(async (userId: string, budget: number, cities: string[], lifestyle: UserLifestyle) => {
    setLoading(true);
    setError(null);
    try {
      // MOCK: Simulate an API call to Backboard.io to store the "hard constraint" memory
      const prefs: UserPreferences = { budget, cities, lifestyle };
      localStorage.setItem(`backboard_prefs_${userId}`, JSON.stringify(prefs));
      
      // We would normally do:
      /*
      await fetch(`https://api.backboard.io/v1/memory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer espr_4KKYNykOlzjvfX1L9V7a5tv9Bl0Z_TTaxLwu5CTgJ_g`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, constraints: prefs })
      });
      */
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(`Budget constraints updated to $${budget}/mo`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPreferences = useCallback(async (userId: string): Promise<UserPreferences | null> => {
    setLoading(true);
    setError(null);
    try {
      // MOCK: Simulate API fetch
      const saved = localStorage.getItem(`backboard_prefs_${userId}`);
      await new Promise(resolve => setTimeout(resolve, 300));
      return saved ? JSON.parse(saved) : null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const flagListing = useCallback((listingId: string, _reason: string) => {
    setFlaggedListings(prev => {
      const updated = [...prev, listingId];
      // Simulate decoupling to global state allowing all users to see it immediately
      localStorage.setItem('backboard_global_flags', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleVaultDoc = useCallback((docId: string) => {
    setVaultStatus(prev => {
      const updated = { ...prev, [docId]: !prev[docId] };
      localStorage.setItem('canAfford_vault', JSON.stringify(updated));
      
      if (updated[docId]) {
        toast.success('Document secured in the Vault!');
      } else {
        toast.success('Document removed from the Vault!');
      }
      
      return updated;
    });
  }, []);

  return { 
    initializeThread, 
    saveUserBudget, 
    getPreferences, 
    flagListing, 
    flaggedListings, 
    loading, 
    error,
    vaultStatus,
    toggleVaultDoc
  };
};
