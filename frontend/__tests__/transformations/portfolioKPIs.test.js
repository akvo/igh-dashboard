import { describe, it, expect } from 'vitest';
import { transformPortfolioKPIs } from '@/lib/transformations';

describe('portfolioKPIs transformations', () => {
  describe('transformPortfolioKPIs', () => {
    it('returns empty array for null input', () => {
      expect(transformPortfolioKPIs(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      expect(transformPortfolioKPIs(undefined)).toEqual([]);
    });

    it('transforms raw data into KPI cards format', () => {
      const rawData = {
        totalDiseases: 215,
        totalCandidates: 8581,
        approvedProducts: 5,
      };

      const result = transformPortfolioKPIs(rawData);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'diseases',
        title: 'Number of diseases',
        value: 215,
        description: 'Total number of diseases',
        buttonText: 'Explore pipeline for diseases',
      });
      expect(result[1]).toEqual({
        id: 'candidates',
        title: 'Total number of candidates',
        value: 8581,
        description: 'Total number of candidates.',
        buttonText: 'Explore candidates',
      });
      expect(result[2]).toEqual({
        id: 'approved',
        title: 'Approved products',
        value: 5,
        description: 'Total number of approved products.',
        buttonText: 'Explore approved products',
      });
    });

    it('handles zero values correctly', () => {
      const rawData = {
        totalDiseases: 0,
        totalCandidates: 0,
        approvedProducts: 0,
      };

      const result = transformPortfolioKPIs(rawData);

      expect(result[0].value).toBe(0);
      expect(result[1].value).toBe(0);
      expect(result[2].value).toBe(0);
    });
  });
});
