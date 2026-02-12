import { describe, it, expect } from 'vitest';
import {
  transformPhaseDistribution,
  extractPhases,
  groupByHealthArea,
  phaseNameToKey,
} from '@/lib/transformations/phaseDistribution';

describe('phaseDistribution transformations', () => {
  const sampleData = [
    { global_health_area: 'Neglected disease', phase_name: 'Discovery', sort_order: 10, candidateCount: 46 },
    { global_health_area: 'Neglected disease', phase_name: 'Preclinical', sort_order: 25, candidateCount: 183 },
    { global_health_area: 'Neglected disease', phase_name: 'Phase I', sort_order: 40, candidateCount: 154 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Discovery', sort_order: 10, candidateCount: 15 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Preclinical', sort_order: 25, candidateCount: 205 },
  ];

  describe('phaseNameToKey', () => {
    it('converts phase name to lowercase key with underscores', () => {
      expect(phaseNameToKey('Phase I')).toBe('phase_i');
      expect(phaseNameToKey('Discovery')).toBe('discovery');
      expect(phaseNameToKey('Primary and secondary screening')).toBe('primary_and_secondary_screening');
    });
  });

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

    it('includes color and simplified label for each phase', () => {
      const phases = extractPhases(sampleData);

      expect(phases[0].color).toBe('#8c4028'); // Discovery color
      expect(phases[0].label).toBe('Discovery');
      expect(phases[2].label).toBe('Phase I');
    });
  });

  describe('groupByHealthArea', () => {
    it('returns empty array for null input', () => {
      expect(groupByHealthArea(null)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(groupByHealthArea([])).toEqual([]);
    });

    it('groups data by health area with phase counts', () => {
      const grouped = groupByHealthArea(sampleData);

      expect(grouped).toHaveLength(2);

      const neglected = grouped.find(g => g.category === 'Neglected disease');
      expect(neglected).toEqual({
        category: 'Neglected disease',
        discovery: 46,
        preclinical: 183,
        phase_i: 154,
      });

      const emerging = grouped.find(g => g.category === 'Emerging infectious disease');
      expect(emerging).toEqual({
        category: 'Emerging infectious disease',
        discovery: 15,
        preclinical: 205,
      });
    });
  });

  describe('transformPhaseDistribution', () => {
    it('returns empty chartData and phases for null input', () => {
      const result = transformPhaseDistribution(null);

      expect(result.chartData).toEqual([]);
      expect(result.phases).toEqual([]);
    });

    it('returns both chartData and phases from raw data', () => {
      const result = transformPhaseDistribution(sampleData);

      expect(result.chartData).toHaveLength(2);
      expect(result.phases).toHaveLength(3);
    });
  });
});
