import axios from 'axios';

const ML_API_BASE = 'http://localhost:8002';

export const mlApi = {
  extractClaims: async (text: string) => {
    try {
      const response = await axios.post(`${ML_API_BASE}/extract`, {
        text,
        source_url: ''
      });
      return response.data;
    } catch (error) {
      console.error('Error extracting claims:', error);
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
      console.error('Error analyzing claim:', error);
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
      console.error('Error finding similar claims:', error);
      return { similar_claims: [] };
    }
  },

  healthCheck: async () => {
    try {
      const response = await axios.get(`${ML_API_BASE}/health`);
      return response.data;
    } catch (error) {
      console.error('ML service health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
};