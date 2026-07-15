import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/content/Markdown.jsx';

describe('renderMarkdown', () => {
  it('renders bold and links to HTML', () => {
    const html = renderMarkdown('A **bold** word and a [link](https://x.test).');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://x.test"');
  });

  it('renders multiple paragraphs', () => {
    const html = renderMarkdown('Para one.\n\nPara two.');
    expect(html).toMatch(/<p>Para one\.<\/p>/);
    expect(html).toMatch(/<p>Para two\.<\/p>/);
  });

  it('strips a <script> tag', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script> world');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Hello');
  });

  it('strips an inline event handler', () => {
    const html = renderMarkdown('<a href="#" onclick="evil()">x</a>');
    expect(html).not.toMatch(/onclick/i);
  });
});
