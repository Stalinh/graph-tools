export function highlightTextNodes(root: ParentNode, query: string): void {
  if (!query.trim()) return;
  const lowerQuery = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    const lowerText = text.toLowerCase();
    if (!lowerText.includes(lowerQuery)) continue;

    const fragment = document.createDocumentFragment();
    let remaining = text;
    while (remaining.length > 0) {
      const lowerRemaining = remaining.toLowerCase();
      const index = lowerRemaining.indexOf(lowerQuery);
      if (index === -1) {
        fragment.appendChild(document.createTextNode(remaining));
        break;
      }

      if (index > 0) {
        fragment.appendChild(document.createTextNode(remaining.slice(0, index)));
      }

      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = remaining.slice(index, index + query.length);
      fragment.appendChild(mark);

      remaining = remaining.slice(index + query.length);
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

export function getMatchPreview(text: string, query: string, contextChars = 30): string {
  if (!text || !query.trim()) return '';
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return '';

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);
  let preview = text.slice(start, end);
  if (start > 0) preview = '...' + preview;
  if (end < text.length) preview = preview + '...';
  return preview;
}
