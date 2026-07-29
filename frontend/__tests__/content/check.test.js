import { describe, it, expect } from 'vitest';
import {
  flattenYaml,
  findTextCallsiteKeys,
  findMarkdownCallsiteKeys,
  findReferencedSchemaKeys,
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

  it('ignores method calls like obj.t(...)', () => {
    const src = `const a = obj.t('home.hero.title'); const b = i18n.t('x.y');`;
    expect(findTextCallsiteKeys(src)).toEqual([]);
  });

  it('finds t() call on a line that also contains a URL with //', () => {
    // Bug: the naive regex strips from the first // to EOL, which wipes the
    // t() callsite that follows an href URL on the same line.
    const src = `{ href: 'https://example.com', label: t('layout.header.about.link') }`;
    expect(findTextCallsiteKeys(src)).toEqual(['layout.header.about.link']);
  });

  it('still ignores a genuinely commented-out t() call', () => {
    const src = `// t('dead.key')\nconst v = t('home.hero.title');`;
    expect(findTextCallsiteKeys(src)).toEqual(['home.hero.title']);
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

describe('findReferencedSchemaKeys', () => {
  const schemaKeys = [
    'home.hero.title',
    'home.hero.subtitle',
    'guided_tour.steps.1.title',
  ];

  it('finds a key held as data, not just one inside a t() call', () => {
    // tourConfig.js stores keys this way and resolves them with t(step.titleKey).
    const src = `const tour = [{ titleKey: 'guided_tour.steps.1.title' }];`;
    expect(findReferencedSchemaKeys(src, schemaKeys)).toEqual([
      'guided_tour.steps.1.title',
    ]);
  });

  it('finds keys in any quote style', () => {
    const single = "a = 'home.hero.title'";
    const double = 'b = "home.hero.subtitle"';
    const backtick = 'c = `guided_tour.steps.1.title`';
    const src = [single, double, backtick].join('\n');
    expect(findReferencedSchemaKeys(src, schemaKeys).sort()).toEqual([
      'guided_tour.steps.1.title',
      'home.hero.subtitle',
      'home.hero.title',
    ]);
  });

  it('ignores a key that appears only in a line comment', () => {
    const src = `// 'home.hero.title' used to be here\nconst v = t('home.hero.subtitle');`;
    expect(findReferencedSchemaKeys(src, schemaKeys)).toEqual([
      'home.hero.subtitle',
    ]);
  });

  it('does not match a key that appears unquoted', () => {
    const src = `const home = { hero: { title: 1 } };`;
    expect(findReferencedSchemaKeys(src, schemaKeys)).toEqual([]);
  });

  it('returns [] when no schema key appears', () => {
    expect(findReferencedSchemaKeys(`const x = 'unrelated.string';`, schemaKeys))
      .toEqual([]);
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
      referencedKeys: Object.keys(schema),
    });
    expect(r.errors).toEqual([]);
  });

  it('errors on a callsite key absent from the schema', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: ['home.hero.title', 'home.missing'],
      markdownKeys: [],
      referencedKeys: Object.keys(schema),
    });
    expect(r.errors.join('\n')).toMatch(/home\.missing/);
  });

  it('errors when a <Markdown> key is not markdown-typed', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: [],
      markdownKeys: ['home.hero.title'],
      referencedKeys: Object.keys(schema),
    });
    expect(r.errors.join('\n')).toMatch(/home\.hero\.title.*markdown/i);
  });

  it('errors when a value exceeds maxLength', () => {
    const r = crossCheck({
      schema,
      values: { ...values, 'home.hero.title': 'x'.repeat(200) },
      textKeys: ['home.hero.title'],
      markdownKeys: ['home.bubble_chart.footer'],
      referencedKeys: Object.keys(schema),
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
      referencedKeys: Object.keys(schema),
    });
    expect(r.errors.join('\n')).toMatch(/home\.hero\.subtitle.*value/i);
  });

  it('errors on a schema key with no reference in src/', () => {
    const r = crossCheck({
      schema,
      values,
      textKeys: ['home.hero.title'],
      markdownKeys: ['home.bubble_chart.footer'],
      referencedKeys: ['home.hero.title', 'home.bubble_chart.footer'],
    });
    expect(r.errors.join('\n')).toMatch(/home\.hero\.subtitle.*no reference/);
  });

  it('does not error on a key referenced only indirectly', () => {
    // subtitle has no t() callsite, but tourConfig-style data holds the key.
    const r = crossCheck({
      schema,
      values,
      textKeys: ['home.hero.title'],
      markdownKeys: ['home.bubble_chart.footer'],
      referencedKeys: Object.keys(schema),
    });
    expect(r.errors).toEqual([]);
  });
});
