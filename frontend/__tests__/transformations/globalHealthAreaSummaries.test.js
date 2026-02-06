import { describe, it, expect } from 'vitest';
import { transformGlobalHealthAreaSummaries } from '@/lib/transformations';

describe('globalHealthAreaSummaries transformations', () => {
  describe('transformGlobalHealthAreaSummaries', () => {
    it('returns empty array for null input', () => {
      expect(transformGlobalHealthAreaSummaries(null)).toEqual([]);
    });

    it('returns empty array for empty array input', () => {
      expect(transformGlobalHealthAreaSummaries([])).toEqual([]);
    });

    it('transforms raw data into bubble chart format', () => {
      const rawData = [
        {
          global_health_area: 'Neglected disease',
          candidateCount: 3611,
          diseaseCount: 112,
          productCount: 7,
        },
      ];

      const result = transformGlobalHealthAreaSummaries(rawData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Neglected diseases',
        value: 3611,
        diseaseCount: 112,
        productCount: 7,
        originalName: 'Neglected disease',
      });
    });

    it('maps health area names to display names', () => {
      const rawData = [
        { global_health_area: 'Neglected disease', candidateCount: 100, diseaseCount: 10, productCount: 1 },
        { global_health_area: 'Sexual & reproductive health', candidateCount: 200, diseaseCount: 20, productCount: 2 },
        { global_health_area: 'Emerging infectious disease', candidateCount: 300, diseaseCount: 30, productCount: 3 },
      ];

      const result = transformGlobalHealthAreaSummaries(rawData);

      expect(result[0].name).toBe('Neglected diseases');
      expect(result[1].name).toBe("Women's health");
      expect(result[2].name).toBe('Emerging infectious diseases');
    });

    it('preserves original name for unmapped health areas', () => {
      const rawData = [
        { global_health_area: 'Unknown Area', candidateCount: 100, diseaseCount: 10, productCount: 1 },
      ];

      const result = transformGlobalHealthAreaSummaries(rawData);

      expect(result[0].name).toBe('Unknown Area');
      expect(result[0].originalName).toBe('Unknown Area');
    });
  });
});
