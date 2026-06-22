import { describe, it, expect } from 'vitest';
import { stackedCSVColumns } from '@/lib/visualInsightsCsv';

describe('stackedCSVColumns', () => {
  const lead = { label: 'Authority', accessor: 'category' };
  const phases = [
    { key: 'who_prequalified', label: 'WHO prequalified' },
    { key: 'no_who_listing', label: 'No formal WHO listing' },
  ];

  it('prepends the lead column and maps each phase to label/key', () => {
    expect(stackedCSVColumns(lead, phases)).toEqual([
      { label: 'Authority', accessor: 'category' },
      { label: 'WHO prequalified', accessor: 'who_prequalified' },
      { label: 'No formal WHO listing', accessor: 'no_who_listing' },
    ]);
  });

  it('returns just the lead column when there are no phases', () => {
    expect(stackedCSVColumns(lead, [])).toEqual([lead]);
  });
});
