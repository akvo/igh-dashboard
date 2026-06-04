#!/usr/bin/env node
// Generate content.generated.js from content.yaml.
//
// Why a generated JS file rather than reading the yaml at runtime:
// every dashboard page is a 'use client' component, so it cannot
// read the filesystem in the browser. Emitting a plain ESM module
// lets the bundler inline the content at build time. Malformed yaml
// throws here and fails the build — that is the "never deploy
// invalid content" guard on the dev side.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export function generateModule(yamlText) {
  const parsed = parseYaml(yamlText) ?? {};
  const json = JSON.stringify(parsed, null, 2);
  return [
    '// Generated from content.yaml by `npm run content:generate`.',
    '// Do not edit directly.',
    `export default ${json};`,
    '',
  ].join('\n');
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const yamlPath = resolve(here, '../../src/content/content.yaml');
  const outPath = resolve(here, '../../src/content/content.generated.js');
  const yamlText = await readFile(yamlPath, 'utf8');
  await writeFile(outPath, generateModule(yamlText), 'utf8');
  console.log(`Wrote ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
