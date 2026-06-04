#!/usr/bin/env node
// Validate content.yaml against the flat schema and cross-check every
// t('key') and <Markdown path="key"> callsite in src/.
//
// Checks (see design "Build-time content layer"):
//   1. Every schema key has a value in content.yaml.
//   2. Every value fits its maxLength.
//   3. Markdown-typed values reject <script> / inline handlers
//      (defense in depth for dev-edited yaml).
//   4. Every callsite key exists in the schema (error if not).
//   5. Every <Markdown> key is markdown-typed (error if not).
//   6. Schema keys with no callsite are warnings (a key may land
//      before its first use).

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(here, '../../');

export function flattenYaml(tree, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(tree || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenYaml(v, path));
    } else if (v != null && !Array.isArray(v)) {
      // Arrays are not a valid content value; skipping them lets
      // crossCheck surface the key as "no value" rather than coercing
      // a misleading comma-joined string.
      out[path] = String(v);
    }
  }
  return out;
}

// Match a bare t('key') call. The negative lookbehind rejects method
// calls (obj.t('x'), i18n.t('x')) and identifiers ending in t, so only
// the standalone content accessor matches. Keys use [A-Za-z0-9_.] by
// convention (page.section.purpose with underscores) — dynamic/computed
// keys are intentionally unsupported.
const T_RE = /(?<![A-Za-z0-9_$.])t\(\s*['"`]([A-Za-z0-9_.]+)['"`]\s*\)/g;
// <Markdown ... path="key" ...> and path={'key'} / path={"key"}.
const MD_RE = /<Markdown\b[^>]*?\bpath\s*=\s*(?:["']([A-Za-z0-9_.]+)["']|\{\s*['"`]([A-Za-z0-9_.]+)['"`]\s*\})/g;

function stripLineComments(src) {
  return src.replace(/\/\/.*$/gm, '');
}

export function findTextCallsiteKeys(src) {
  const stripped = stripLineComments(src);
  const keys = new Set();
  for (const m of stripped.matchAll(T_RE)) keys.add(m[1]);
  return Array.from(keys);
}

export function findMarkdownCallsiteKeys(src) {
  const stripped = stripLineComments(src);
  const keys = new Set();
  for (const m of stripped.matchAll(MD_RE)) keys.add(m[1] ?? m[2]);
  return Array.from(keys);
}

export function crossCheck({ schema, values, textKeys, markdownKeys }) {
  const errors = [];
  const warnings = [];
  const schemaKeys = Object.keys(schema);
  const schemaSet = new Set(schemaKeys);
  const allCallsites = new Set([...textKeys, ...markdownKeys]);

  // Coverage + length + markdown safety.
  for (const key of schemaKeys) {
    const entry = schema[key];
    const value = values[key];
    if (value === undefined) {
      errors.push(`${key}: schema key has no value in content.yaml`);
      continue;
    }
    if (typeof entry.maxLength === 'number' && value.length > entry.maxLength) {
      errors.push(
        `${key}: length ${value.length} exceeds maxLength ${entry.maxLength}`,
      );
    }
    if (entry.type === 'markdown') {
      if (/<script\b/i.test(value)) errors.push(`${key}: contains <script>`);
      if (/(?:^|\s)on[a-z]+\s*=/i.test(value)) {
        errors.push(`${key}: contains inline event handler`);
      }
    }
  }

  // Callsite keys must exist in the schema.
  for (const key of allCallsites) {
    if (!schemaSet.has(key)) {
      errors.push(`callsite key not in schema: ${key}`);
    }
  }

  // <Markdown> keys must be markdown-typed.
  for (const key of markdownKeys) {
    if (schemaSet.has(key) && schema[key].type !== 'markdown') {
      errors.push(`<Markdown path="${key}"> but schema type is not markdown`);
    }
  }

  // Schema keys with no callsite are warnings.
  for (const key of schemaKeys) {
    if (!allCallsites.has(key)) warnings.push(key);
  }

  return { errors, warnings };
}

async function* walkFiles(dir, exts) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full, exts);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      yield full;
    }
  }
}

async function main() {
  const yamlText = await readFile(
    resolve(FRONTEND_ROOT, 'src/content/content.yaml'),
    'utf8',
  );
  const schemaText = await readFile(
    resolve(FRONTEND_ROOT, 'src/content/content.schema.json'),
    'utf8',
  );
  const values = flattenYaml(parseYaml(yamlText) ?? {});
  const schema = JSON.parse(schemaText);

  const textKeys = new Set();
  const markdownKeys = new Set();
  for await (const f of walkFiles(resolve(FRONTEND_ROOT, 'src'), ['.js', '.jsx'])) {
    const src = await readFile(f, 'utf8');
    for (const k of findTextCallsiteKeys(src)) textKeys.add(k);
    for (const k of findMarkdownCallsiteKeys(src)) markdownKeys.add(k);
  }

  const { errors, warnings } = crossCheck({
    schema,
    values,
    textKeys: Array.from(textKeys),
    markdownKeys: Array.from(markdownKeys),
  });

  for (const w of warnings) {
    console.warn(`WARN schema key with no callsite: ${w}`);
  }
  if (errors.length) {
    for (const e of errors) console.error(`ERROR ${e}`);
    process.exit(1);
  }

  console.log(
    `OK — ${Object.keys(schema).length} schema keys, ` +
      `${textKeys.size} t() + ${markdownKeys.size} <Markdown> callsites.`,
  );
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
