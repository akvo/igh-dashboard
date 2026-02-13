import { describe, it, expect } from 'vitest';
import {
  transformCandidateTypeDistribution,
  extractCandidateTypes,
  groupByHealthArea,
} from '@/lib/transformations/candidateTypeDistribution';

describe('candidateTypeDistribution transformations', () => {
  const sampleData = [
    { global_health_area: 'Neglected disease', candidate_type: 'Candidate', candidateCount: 100 },
    { global_health_area: 'Neglected disease', candidate_type: 'Product', candidateCount: 30 },
    { global_health_area: 'Emerging infectious disease', candidate_type: 'Candidate', candidateCount: 200 },
    { global_health_area: 'Emerging infectious disease', candidate_type: 'Product', candidateCount: 80 },
    { global_health_area: 'Sexual & reproductive health', candidate_type: 'Candidate', candidateCount: 150 },
    { global_health_area: 'Sexual & reproductive health', candidate_type: 'Product', candidateCount: 60 },
  ];

  describe('extractCandidateTypes', () => {
    it('returns two segments: Candidates and Products', () => {
      const segments = extractCandidateTypes();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({ key: 'candidates', label: 'Candidates', color: '#fe7449' });
      expect(segments[1]).toEqual({ key: 'products', label: 'Products', color: '#f9a78d' });
    });
  });

  describe('groupByHealthArea', () => {
    it('returns empty array for null input', () => {
      expect(groupByHealthArea(null)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(groupByHealthArea([])).toEqual([]);
    });

    it('groups data by health area with candidate/product counts', () => {
      const grouped = groupByHealthArea(sampleData);

      expect(grouped).toHaveLength(3);

      const neglected = grouped.find(g => g.category === 'Neglected diseases');
      expect(neglected).toEqual({
        category: 'Neglected diseases',
        candidates: 100,
        products: 30,
      });

      const emerging = grouped.find(g => g.category === 'Emerging infectious diseases');
      expect(emerging).toEqual({
        category: 'Emerging infectious diseases',
        candidates: 200,
        products: 80,
      });
    });

    it('uses display names from HEALTH_AREA_DISPLAY_NAMES', () => {
      const grouped = groupByHealthArea(sampleData);
      const categories = grouped.map(g => g.category);

      expect(categories).toContain('Neglected diseases');
      expect(categories).toContain("Women's health");
      expect(categories).toContain('Emerging infectious diseases');
      expect(categories).not.toContain('Neglected disease');
      expect(categories).not.toContain('Sexual & reproductive health');
    });
  });

  describe('transformCandidateTypeDistribution', () => {
    it('returns empty chartData and segments for null input', () => {
      const result = transformCandidateTypeDistribution(null);

      expect(result.chartData).toEqual([]);
      expect(result.segments).toHaveLength(2);
    });

    it('returns both chartData and segments from raw data', () => {
      const result = transformCandidateTypeDistribution(sampleData);

      expect(result.chartData).toHaveLength(3);
      expect(result.segments).toHaveLength(2);
    });

    it('segments always contain Candidates and Products', () => {
      const result = transformCandidateTypeDistribution(sampleData);

      expect(result.segments.map(s => s.key)).toEqual(['candidates', 'products']);
    });
  });
});
