import { describe, it, expect } from 'vitest';
import {
  flattenYaml,
  findTextCallsiteKeys,
  findMarkdownCallsiteKeys,
  crossCheck,
} from '@/../scripts/content/check.mjs';

describe('flattenYaml', () => {
  it('flattens nested objects to dotted keys', () => {
    expect(flattenYaml({ home: { hero: { title: 'Hi' } } })).toEqual({
      'home.hero.title': 'Hi',
    });
  });

  it('returns {} for empty input', () => {
    expect(flattenYaml({})).toEqual({});
  });
});

describe('findTextCallsiteKeys', () => {
  it('extracts keys from t() calls', () => {
    const src = `
      import { t } from '@/content';
      const a = t('home.hero.title');
      const b = t("home.hero.subtitle");
    `;
    expect(findTextCallsiteKeys(src).sort()).toEqual([
      'home.hero.subtitle',
      'home.hero.title',
    ]);
  });

  it('ignores commented-out calls', () => {
    const src = `// t('old.key')\nconst v = t('home.hero.title');`;
    expect(findTextCallsiteKeys(src)).toEqual(['home.hero.title']);
  });

  it('returns [] when no t() calls present', () => {
    expect(findTextCallsiteKeys('const x = 1;')).toEqual([]);
  });
});

describe('findMarkdownCallsiteKeys', () => {
  it('extracts keys from <Markdown path="..."> usages', () => {
    const src = `
      <Markdown path="home.bubble_chart.footer" />
      <Markdown className="x" path={'home.map.footer'} />
    `;
    expect(findMarkdownCallsiteKeys(src).sort()).toEqual([
      'home.bubble_chart.footer',
      'home.map.footer',
    ]);
  });

  it('returns [] when no Markdown usages present', () => {
    expect(findMarkdownCallsiteKeys('const x = 1;')).toEqual([]);
  });
});

describe('crossCheck', () => {
  const schema = {
    'home.hero.title': { type: 'text', maxLength: 80 },
    'home.hero.subtitle': { type: 'text', maxLength: 200 },
    'home.bubble_chart.footer': { type: 'markdown', maxLength: 1000 },
  };
  const values = {
    'home.hero.title': 'Hi',
    'home.hero.subtitle': 'There',
    'home.bubble_chart.footer': 'A **footer**.',
  };

  it('passes when every callsite key matches and values fit', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: ['home.hero.title', 'home.hero.subtitle'],
      markdownKeys: ['home.bubble_chart.footer'],
    });
    expect(r.errors).toEqual([]);
  });

  it('errors on a callsite key absent from the schema', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: ['home.hero.title', 'home.missing'],
      markdownKeys: [],
    });
    expect(r.errors.join('\n')).toMatch(/home\.missing/);
  });

  it('errors when a <Markdown> key is not markdown-typed', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: [],
      markdownKeys: ['home.hero.title'],
    });
    expect(r.errors.join('\n')).toMatch(/home\.hero\.title.*markdown/i);
  });

  it('errors when a value exceeds maxLength', () => {
    const r = crossCheck({
      schema,
      values: { ...values, 'home.hero.title': 'x'.repeat(200) },
      textKeys: ['home.hero.title'],
      markdownKeys: ['home.bubble_chart.footer'],
    });
    expect(r.errors.join('\n')).toMatch(/home\.hero\.title.*maxLength|length/i);
  });

  it('errors when a schema key has no value in yaml', () => {
    const { 'home.hero.subtitle': _omit, ...partial } = values;
    const r = crossCheck({
      schema,
      values: partial,
      textKeys: ['home.hero.title', 'home.hero.subtitle'],
      markdownKeys: ['home.bubble_chart.footer'],
    });
    expect(r.errors.join('\n')).toMatch(/home\.hero\.subtitle.*value/i);
  });

  it('warns on a schema key with no callsite', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: ['home.hero.title'],
      markdownKeys: ['home.bubble_chart.footer'],
    });
    expect(r.warnings.join('\n')).toMatch(/home\.hero\.subtitle/);
    expect(r.errors).toEqual([]);
  });
});
