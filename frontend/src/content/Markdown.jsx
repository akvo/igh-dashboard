import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { t } from './index.js';

// Pure transform: markdown string → sanitized HTML string. Exported
// separately from the component so it can be unit-tested without a
// React renderer. marked runs synchronously; DOMPurify removes any
// <script>, event handlers, or other unsafe nodes that slipped
// through the content-repo validator.
export function renderMarkdown(md) {
  const rawHtml = marked.parse(md ?? '', { async: false });
  return DOMPurify.sanitize(rawHtml);
}

// Resolve a markdown-typed content key and render it. `path` is the
// same dotted key used with t(); content:check verifies the key's
// schema type is "markdown".
export function Markdown({ path, className }) {
  const html = renderMarkdown(t(path));
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
