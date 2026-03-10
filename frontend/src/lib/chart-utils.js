// Word-wrap text at word boundaries into lines of at most `limit` characters.
function wrapText(text, limit) {
  const lines = [];
  while (text.length > limit) {
    const edge = text.slice(0, limit).lastIndexOf(' ');
    if (edge <= 0) break;
    lines.push(text.slice(0, edge));
    text = text.slice(edge + 1);
  }
  lines.push(text);
  return lines;
}

// Truncate text that exceeds maxChars and word-wrap the result into
// shorter lines (2/3 of maxChars) for readable axis labels.
export function wrapLabel(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const truncated = text.slice(0, maxChars - 1) + '…';
  return wrapText(truncated, Math.floor((maxChars * 2) / 3));
}
