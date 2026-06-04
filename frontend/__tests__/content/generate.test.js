import { describe, it, expect } from 'vitest';
import { generateModule } from '@/../scripts/content/generate.mjs';

describe('generateModule', () => {
  it('emits a default export of the parsed yaml object', () => {
    const yaml = `
home:
  hero:
    title: Hello
`;
    const out = generateModule(yaml);
    expect(out).toContain('export default');
    expect(out).toContain('"home"');
    expect(out).toContain('"Hello"');
  });

  it('treats an empty document as an empty object', () => {
    const out = generateModule('{}');
    expect(out).toContain('export default {');
  });

  it('throws on malformed yaml', () => {
    expect(() =>
      generateModule('home:\n  hero:\n    title: "unterminated'),
    ).toThrow();
  });

  it('preserves unicode and special characters', () => {
    const out = generateModule(`home:\n  hero:\n    title: "R&D — α/β"\n`);
    expect(out).toContain('R&D — α/β');
  });
});
