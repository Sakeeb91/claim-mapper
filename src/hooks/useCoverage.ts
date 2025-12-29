'use client';

import { useQuery } from 'react-query';
import { CoverageData, LinkedEvidence } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Fetch coverage data for a reasoning chain
 */
async function fetchCoverage(
  chainId: string,
  token: string
): Promise<CoverageData> {
  const response = await fetch(`${API_BASE_URL}/reasoning/${chainId}/coverage`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch coverage data');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Fetch linked evidence for a specific step
 */
async function fetchStepEvidence(
  chainId: string,
  stepNumber: number,
  token: string
): Promise<{
  stepNumber: number;
  premiseText: string;
  linkedEvidence: LinkedEvidence[];
}> {
  const response = await fetch(
    `${API_BASE_URL}/reasoning/${chainId}/steps/${stepNumber}/evidence`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch step evidence');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Hook for fetching reasoning chain coverage data
 *
 * @param chainId - The reasoning chain ID
 * @param token - Authentication token
 * @param options - Additional query options
 */
export function useCoverage(
  chainId: string | undefined,
  token: string | undefined,
  options: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const { enabled = true, refetchOnWindowFocus = false } = options;

  return useQuery(
    ['coverage', chainId],
    () => fetchCoverage(chainId!, token!),
    {
      enabled: enabled && !!chainId && !!token,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus,
    }
  );
}

/**
 * Hook for fetching linked evidence for a specific premise step
 *
 * @param chainId - The reasoning chain ID
 * @param stepNumber - The step number to fetch evidence for
 * @param token - Authentication token
 * @param options - Additional query options
 */
export function useStepEvidence(
  chainId: string | undefined,
  stepNumber: number | undefined,
  token: string | undefined,
  options: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const { enabled = true, refetchOnWindowFocus = false } = options;

  return useQuery(
    ['stepEvidence', chainId, stepNumber],
    () => fetchStepEvidence(chainId!, stepNumber!, token!),
    {
      enabled: enabled && !!chainId && stepNumber !== undefined && !!token,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus,
    }
  );
}

export default useCoverage;
