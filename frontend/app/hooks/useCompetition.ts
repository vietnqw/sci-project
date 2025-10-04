import { useState, useEffect } from 'react';
import { competitionsAPI, Competition } from '../api/competitions';

interface UseCompetitionReturn {
  competition: Competition | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCompetition(competitionId: string): UseCompetitionReturn {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetition = async () => {
    if (!competitionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await competitionsAPI.getCompetition(competitionId);
      setCompetition(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load competition details');
      setCompetition(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetition();
  }, [competitionId]);

  return {
    competition,
    isLoading,
    error,
    refetch: fetchCompetition,
  };
}
