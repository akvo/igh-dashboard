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

// Word-wrap text into lines of at most `maxChars` characters at word
// boundaries for readable axis labels.
export function wrapLabel(text, maxChars) {
  if (text.length <= maxChars) return [text];
  return wrapText(text, maxChars);
}
