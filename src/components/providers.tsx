'use client';

import { QueryClient, QueryClientProvider } from 'react-query';
import { useState, useEffect } from 'react';
import { useSearchStore } from '@/store/searchStore';
import { SearchService } from '@/services/searchApi';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

const providerLogger = logger.child({ component: LOG_COMPONENTS.APP_PROVIDERS });

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  }));

  // Initialize search preferences on app load
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        // Load user preferences if authenticated
        const preferences = await SearchService.getSearchPreferences();
        useSearchStore.getState().updatePreferences(preferences);
      } catch (error) {
        // User not authenticated or preferences not found - use defaults
        providerLogger.debug('Using default search preferences', {
          action: LOG_ACTIONS.INITIALIZE,
        });
      }
    };

    initializeSearch();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>
        {children}
      </SearchProvider>
    </QueryClientProvider>
  );
}

// Search context provider for initialization
function SearchProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}