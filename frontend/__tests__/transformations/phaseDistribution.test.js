import { describe, it, expect } from 'vitest';
import {
  extractPhases,
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
      expect(phases.map(p => p.sortOrder)).toEqual([8, 12, 30]);
      expect(phases.map(p => p.fullLabel)).toEqual(['Discovery', 'Preclinical', 'Phase I']);
    });

    it('includes color and simplified label for each phase', () => {
      const phases = extractPhases(sampleData);

      expect(phases[0].color).toBe('#AD5133'); // Discovery color
      expect(phases[0].label).toBe('Discovery');
      expect(phases[2].label).toBe('Phase I');
    });
  });
});
