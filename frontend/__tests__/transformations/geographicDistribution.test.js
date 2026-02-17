import { describe, it, expect } from 'vitest';
import {
  transformGeographicDistribution,
  transformToMapData,
} from '@/lib/transformations/geographicDistribution';

describe('geographicDistribution transformations', () => {
  // API now returns alpha-3 ISO codes
  const sampleData = [
    { country_key: 50, country_name: 'South Africa', iso_code: 'ZAF', candidateCount: 11 },
    { country_key: 54, country_name: 'Tanzania', iso_code: 'TZA', candidateCount: 11 },
    { country_key: 29, country_name: 'Kenya', iso_code: 'KEN', candidateCount: 9 },
  ];

  describe('transformToMapData', () => {
    it('returns empty object for null input', () => {
      expect(transformToMapData(null)).toEqual({});
    });

    it('returns empty object for empty array', () => {
      expect(transformToMapData([])).toEqual({});
    });

    it('converts alpha-3 ISO codes to numeric codes for TopoJSON', () => {
      const result = transformToMapData(sampleData);

      expect(result).toEqual({
        '710': 11,  // ZAF → 710
        '834': 11,  // TZA → 834
        '404': 9,   // KEN → 404
      });
    });

    it('converts common alpha-3 codes correctly', () => {
      const data = [
        { iso_code: 'USA', candidateCount: 100 },
        { iso_code: 'GBR', candidateCount: 50 },
        { iso_code: 'IND', candidateCount: 30 },
      ];

      const result = transformToMapData(data);

      expect(result).toEqual({
        '840': 100,  // USA → 840
        '826': 50,   // GBR → 826
        '356': 30,   // IND → 356
      });
    });

    it('skips items without iso_code', () => {
      const dataWithMissing = [
        { country_key: 1, country_name: 'Country A', iso_code: 'USA', candidateCount: 5 },
        { country_key: 2, country_name: 'Country B', iso_code: null, candidateCount: 3 },
        { country_key: 3, country_name: 'Country C', candidateCount: 2 },
      ];

      const result = transformToMapData(dataWithMissing);

      expect(result).toEqual({ '840': 5 });
    });

    it('falls back to raw iso_code for unknown alpha-3 codes', () => {
      const data = [
        { iso_code: 'ZZZ', candidateCount: 7 },
      ];

      const result = transformToMapData(data);

      expect(result).toEqual({ ZZZ: 7 });
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
      expect(result.distributionList).toBe(sampleData);
    });
  });
});
