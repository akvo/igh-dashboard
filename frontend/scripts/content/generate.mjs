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
import { watch } from 'node:fs';
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

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(here, '../../src/content');
const YAML_PATH = resolve(CONTENT_DIR, 'content.yaml');
const OUT_PATH = resolve(CONTENT_DIR, 'content.generated.js');

async function writeOnce() {
  const yamlText = await readFile(YAML_PATH, 'utf8');
  await writeFile(OUT_PATH, generateModule(yamlText), 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
}

async function main() {
  await writeOnce();

  // `--watch` keeps the process alive and regenerates whenever
  // content.yaml changes — a dev convenience for editing copy while
  // `next dev` runs (Turbopack HMR then picks up the new generated
  // module). The build pipeline never uses this; prebuild calls the
  // one-shot generate. We watch the directory rather than the file
  // because editors commonly save atomically by replacing it, which
  // a direct file watch loses; a short debounce collapses the burst
  // of events a single save emits.
  if (process.argv.includes('--watch')) {
    let timer;
    watch(CONTENT_DIR, (_event, filename) => {
      if (filename !== 'content.yaml') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        writeOnce().catch((e) => console.error(e));
      }, 50);
    });
    console.log('Watching content.yaml for changes (Ctrl-C to stop)…');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
