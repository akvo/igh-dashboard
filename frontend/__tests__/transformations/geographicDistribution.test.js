import { describe, it, expect } from 'vitest';
import {
  transformGeographicDistribution,
  transformToMapData,
} from '@/lib/transformations/geographicDistribution';

describe('geographicDistribution transformations', () => {
  const sampleData = [
    { country_key: 50, country_name: 'South Africa', iso_code: '710', candidateCount: 11 },
    { country_key: 54, country_name: 'Tanzania', iso_code: '834', candidateCount: 11 },
    { country_key: 29, country_name: 'Kenya', iso_code: '404', candidateCount: 9 },
  ];

  describe('transformToMapData', () => {
    it('returns empty object for null input', () => {
      expect(transformToMapData(null)).toEqual({});
    });

    it('returns empty object for empty array', () => {
      expect(transformToMapData([])).toEqual({});
    });

    it('transforms array to map data object keyed by iso_code', () => {
      const result = transformToMapData(sampleData);

      expect(result).toEqual({
        '710': 11,
        '834': 11,
        '404': 9,
      });
    });

    it('skips items without iso_code', () => {
      const dataWithMissing = [
        { country_key: 1, country_name: 'Country A', iso_code: '001', candidateCount: 5 },
        { country_key: 2, country_name: 'Country B', iso_code: null, candidateCount: 3 },
        { country_key: 3, country_name: 'Country C', candidateCount: 2 },
      ];

      const result = transformToMapData(dataWithMissing);

      expect(result).toEqual({ '001': 5 });
    });
  });

  describe('transformGeographicDistribution', () => {
    it('returns empty mapData and distributionList for null input', () => {
      const result = transformGeographicDistribution(null);

      expect(result.mapData).toEqual({});
      expect(result.distributionList).toEqual([]);
    });

    it('returns both mapData and distributionList from raw data', () => {
      const result = transformGeographicDistribution(sampleData);

      expect(Object.keys(result.mapData)).toHaveLength(3);
      expect(result.distributionList).toHaveLength(3);
      expect(result.distributionList).toBe(sampleData); // Same reference
    });
  });
});
