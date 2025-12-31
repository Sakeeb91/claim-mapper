import axios from 'axios';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

const ML_API_BASE = 'http://localhost:8002';

// Create child logger for ML API service
const mlLogger = logger.child({ component: LOG_COMPONENTS.ML_API });

export const mlApi = {
  extractClaims: async (text: string) => {
    try {
      const response = await axios.post(`${ML_API_BASE}/extract`, {
        text,
        source_url: ''
      });
      return response.data;
    } catch (error) {
      mlLogger.error('Error extracting claims', {
        action: LOG_ACTIONS.EXTRACT_CLAIMS,
        error: error instanceof Error ? error : String(error),
        textLength: text.length,
      });
      return [];
    }
  },

  analyzeClaim: async (claimText: string) => {
    try {
      const response = await axios.post(`${ML_API_BASE}/analyze`, {
        claim_text: claimText
      });
      return response.data;
    } catch (error) {
      mlLogger.error('Error analyzing claim', {
        action: LOG_ACTIONS.ANALYZE_CLAIM,
        error: error instanceof Error ? error : String(error),
        claimTextLength: claimText.length,
      });
      return null;
    }
  },

  findSimilar: async (claimText: string) => {
    try {
      const response = await axios.get(`${ML_API_BASE}/similarity`, {
        params: { claim_text: claimText, limit: 5 }
      });
      return response.data;
    } catch (error) {
      mlLogger.error('Error finding similar claims', {
        action: LOG_ACTIONS.FIND_SIMILAR,
        error: error instanceof Error ? error : String(error),
        claimTextLength: claimText.length,
      });
      return { similar_claims: [] };
    }
  },

  healthCheck: async () => {
    try {
      const response = await axios.get(`${ML_API_BASE}/health`);
      return response.data;
    } catch (error) {
      mlLogger.error('ML service health check failed', {
        action: LOG_ACTIONS.HEALTH_CHECK,
        error: error instanceof Error ? error : String(error),
      });
      return { status: 'unhealthy' };
    }
  }
};
