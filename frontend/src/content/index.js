import content from './content.generated.js';

// Resolve a dotted path against the generated content tree. Throw on
// a missing or non-string target — every callsite expects a value,
// and silently returning undefined would propagate to the UI as the
// literal string "undefined".
export function t(path) {
  const parts = path.split('.');
  let node = content;
  for (const part of parts) {
    if (node === null || typeof node !== 'object' || !(part in node)) {
      throw new Error(`Missing content key: ${path}`);
    }
    node = node[part];
  }
  if (typeof node !== 'string') {
    throw new Error(`Missing content key: ${path}`);
  }
  return node;
}
