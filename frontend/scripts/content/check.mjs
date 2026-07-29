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
//   6. Schema keys not referenced anywhere in src/ are errors — every
//      schema key becomes an editable file in the content repo, so an
//      unreferenced one is a file an editor can change with no effect.

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

// Strip `//` line comments from JavaScript source while leaving `//` inside
// string literals intact. The naive regex approach (/\/\/.*$/gm) treats the
// `//` in URLs like `href: 'https://example.com'` as a comment start, which
// wipes any t('key') callsite that follows it on the same line.
//
// We do a single character-scan per line, tracking whether we are inside a
// quoted string ('..."...'  "..."  `...`). Backslash-escaped quotes are
// skipped so we don't mistake `\'` for a string end. The scan is deliberately
// minimal: no support for multi-line template literals (callsite keys are
// always on a single line) and no regex or parser dependency.
function stripLineComments(src) {
  return src
    .split('\n')
    .map((line) => {
      let inStr = null; // current string delimiter, or null when outside a string
      for (let i = 0; i < line.length - 1; i++) {
        const ch = line[i];
        if (inStr) {
          if (ch === '\\') {
            i++; // skip the escaped character
          } else if (ch === inStr) {
            inStr = null; // string closed
          }
        } else if (ch === "'" || ch === '"' || ch === '`') {
          inStr = ch; // string opened
        } else if (ch === '/' && line[i + 1] === '/') {
          return line.slice(0, i); // real comment — drop it
        }
      }
      return line; // no unquoted // found
    })
    .join('\n');
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

// A key held as data — tourConfig.js's `titleKey: 'guided_tour.steps.1.title'`,
// resolved later by t(step.titleKey) — is a real reference that T_RE cannot
// see, because T_RE only matches a literal t('key') call.
//
// Rather than teaching the scanner each indirection shape (a key field, an
// array of keys, a lookup map), treat any schema key that appears as a quoted
// literal as referenced. We already know the full key set, so this is a
// membership test rather than a parser, and it needs no maintenance when a new
// indirection shape appears.
//
// The trade-off: this proves the key is mentioned in src/, not that it is
// rendered. A key referenced only from dead code counts as used. That is
// acceptable for deciding whether a key is dead — line comments are stripped
// and tests live outside src/.
export function findReferencedSchemaKeys(src, schemaKeys) {
  const stripped = stripLineComments(src);
  return schemaKeys.filter(
    (k) =>
      stripped.includes(`'${k}'`) ||
      stripped.includes(`"${k}"`) ||
      stripped.includes(`\`${k}\``),
  );
}

export function crossCheck({ schema, values, textKeys, markdownKeys, referencedKeys }) {
  const errors = [];
  const schemaKeys = Object.keys(schema);
  const schemaSet = new Set(schemaKeys);
  const allCallsites = new Set([...textKeys, ...markdownKeys]);
  const referenced = new Set(referencedKeys);

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

  // Every schema key becomes an editable file in the content repo, so a key
  // nothing references is a file an editor can change with no visible effect.
  // `referenced` is deliberately looser than `allCallsites` — it includes keys
  // held as data — but the two checks above stay bound to real callsites, so a
  // typo'd t('bad.key') still fails.
  for (const key of schemaKeys) {
    if (!referenced.has(key)) {
      errors.push(
        `${key}: schema key has no reference in src/ — every schema key ` +
          `becomes an editable file in the content repo, so add the t() ` +
          `callsite or remove the key from content.yaml`,
      );
    }
  }

  return { errors };
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
  const referencedKeys = new Set();
  const schemaKeys = Object.keys(schema);
  for await (const f of walkFiles(resolve(FRONTEND_ROOT, 'src'), ['.js', '.jsx'])) {
    const src = await readFile(f, 'utf8');
    for (const k of findTextCallsiteKeys(src)) textKeys.add(k);
    for (const k of findMarkdownCallsiteKeys(src)) markdownKeys.add(k);
    for (const k of findReferencedSchemaKeys(src, schemaKeys)) referencedKeys.add(k);
  }

  const { errors } = crossCheck({
    schema,
    values,
    textKeys: Array.from(textKeys),
    markdownKeys: Array.from(markdownKeys),
    referencedKeys: Array.from(referencedKeys),
  });

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
