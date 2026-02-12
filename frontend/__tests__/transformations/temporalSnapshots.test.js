import { describe, it, expect } from 'vitest';
import {
  transformTemporalSnapshots,
  extractPhases,
  groupByYear,
} from '@/lib/transformations/temporalSnapshots';

describe('temporalSnapshots transformations', () => {
  const sampleData = [
    { year: 2023, phase_name: 'Discovery', sort_order: 10, candidateCount: 61 },
    { year: 2023, phase_name: 'Preclinical', sort_order: 25, candidateCount: 388 },
    { year: 2023, phase_name: 'Phase I', sort_order: 40, candidateCount: 265 },
    { year: 2024, phase_name: 'Discovery', sort_order: 10, candidateCount: 15 },
    { year: 2024, phase_name: 'Preclinical', sort_order: 25, candidateCount: 204 },
  ];

  describe('extractPhases', () => {
    it('returns empty array for null input', () => {
      expect(extractPhases(null)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(extractPhases([])).toEqual([]);
    });

    it('extracts unique phases sorted by sort_order', () => {
      const phases = extractPhases(sampleData);

      expect(phases).toHaveLength(3);
      expect(phases.map(p => p.sortOrder)).toEqual([10, 25, 40]);
      expect(phases.map(p => p.fullLabel)).toEqual(['Discovery', 'Preclinical', 'Phase I']);
    });

    it('includes color and key for each phase', () => {
      const phases = extractPhases(sampleData);

      expect(phases[0].key).toBe('discovery');
      expect(phases[0].color).toBe('#8c4028');
    });
  });

  describe('groupByYear', () => {
    it('returns empty array for null input', () => {
      expect(groupByYear(null)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(groupByYear([])).toEqual([]);
    });

    it('groups data by year with phase counts', () => {
      const grouped = groupByYear(sampleData);

      expect(grouped).toHaveLength(2);
      expect(grouped[0]).toEqual({
        category: '2023',
        discovery: 61,
        preclinical: 388,
        phase_i: 265,
      });
      expect(grouped[1]).toEqual({
        category: '2024',
        discovery: 15,
        preclinical: 204,
      });
    });

    it('sorts results by year ascending', () => {
      const unorderedData = [
        { year: 2025, phase_name: 'Discovery', sort_order: 10, candidateCount: 100 },
        { year: 2020, phase_name: 'Discovery', sort_order: 10, candidateCount: 50 },
        { year: 2023, phase_name: 'Discovery', sort_order: 10, candidateCount: 75 },
      ];

      const grouped = groupByYear(unorderedData);

      expect(grouped.map(g => g.category)).toEqual(['2020', '2023', '2025']);
    });
  });

  describe('transformTemporalSnapshots', () => {
    it('returns empty chartData and phases for null input', () => {
      const result = transformTemporalSnapshots(null);

      expect(result.chartData).toEqual([]);
      expect(result.phases).toEqual([]);
    });

    it('returns both chartData and phases from raw data', () => {
      const result = transformTemporalSnapshots(sampleData);

      expect(result.chartData).toHaveLength(2);
      expect(result.phases).toHaveLength(3);
    });
  });
});
