const allowedTags = new Set(['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li']);
const allowedTextAlign = new Set(['left', 'center']);

function getDocument(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function sanitizeNode(node: Node, targetDocument: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [targetDocument.createTextNode(node.textContent ?? '')];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const sourceElement = node as Element;
  const tagName = sourceElement.tagName.toLowerCase();
  const childNodes = Array.from(sourceElement.childNodes).flatMap((child) =>
    sanitizeNode(child, targetDocument),
  );

  if (!allowedTags.has(tagName)) {
    return childNodes;
  }

  const element = targetDocument.createElement(tagName);

  if (tagName === 'p') {
    const style = sourceElement.getAttribute('style') ?? '';
    const match = style.match(/text-align\s*:\s*(left|center)/i);
    const alignment = match?.[1]?.toLowerCase() ?? '';

    if (allowedTextAlign.has(alignment)) {
      element.style.textAlign = alignment;
    }
  }

  if (tagName === 'br') {
    return [element];
  }

  childNodes.forEach((child) => element.appendChild(child));

  return [element];
}

function buildSanitizedBody(html: string) {
  const sourceDocument = getDocument(html);
  const targetDocument = document.implementation.createHTMLDocument('');
  const wrapper = targetDocument.createElement('div');

  Array.from(sourceDocument.body.childNodes)
    .flatMap((child) => sanitizeNode(child, targetDocument))
    .forEach((child) => wrapper.appendChild(child));

  return wrapper;
}

export function isRichTextEmpty(html: string) {
  const wrapper = buildSanitizedBody(html);
  const text = wrapper.textContent?.replace(/\s+/g, '') ?? '';

  return text.length === 0 && wrapper.querySelector('br') === null;
}

export function normalizeRichTextHtml(html: string) {
  const wrapper = buildSanitizedBody(html);
  const normalized = wrapper.innerHTML.replace(/&nbsp;/g, ' ').trim();

  return isRichTextEmpty(normalized) ? '' : normalized;
}

export function createRichTextMarkup(html: string) {
  return { __html: normalizeRichTextHtml(html) };
}
