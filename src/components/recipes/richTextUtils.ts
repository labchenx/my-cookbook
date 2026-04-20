import type { JSONContent } from '@tiptap/core';

export type RichTextDerivedValue = {
  json: JSONContent;
  html: string;
  text: string;
};

type RichTextMark = {
  type: 'bold' | 'italic' | 'underline';
};

const allowedTextAlign = new Set(['left', 'center']);
const allowedMarkTypes = new Set(['bold', 'italic', 'underline']);
const blockTypes = new Set(['paragraph', 'bulletList', 'orderedList']);
const inlineTypes = new Set(['text', 'hardBreak']);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cloneMark(mark: JSONContent): RichTextMark | null {
  if (!mark.type || !allowedMarkTypes.has(mark.type)) {
    return null;
  }

  return { type: mark.type as RichTextMark['type'] };
}

function normalizeTextNode(node: JSONContent): JSONContent | null {
  if (node.type !== 'text' || typeof node.text !== 'string' || node.text.length === 0) {
    return null;
  }

  const marks = Array.isArray(node.marks)
    ? node.marks.map(cloneMark).filter((mark): mark is RichTextMark => mark !== null)
    : undefined;

  return {
    type: 'text',
    text: node.text,
    ...(marks && marks.length > 0 ? { marks } : {}),
  };
}

function normalizeParagraph(node: JSONContent): JSONContent {
  const textAlign =
    typeof node.attrs?.textAlign === 'string' && allowedTextAlign.has(node.attrs.textAlign)
      ? node.attrs.textAlign
      : undefined;
  const content = Array.isArray(node.content)
    ? node.content.flatMap(normalizeInlineNode).filter((child): child is JSONContent => child !== null)
    : [];

  return {
    type: 'paragraph',
    ...(textAlign ? { attrs: { textAlign } } : {}),
    ...(content.length > 0 ? { content } : {}),
  };
}

function normalizeListItem(node: JSONContent): JSONContent | null {
  const normalizedContent = Array.isArray(node.content)
    ? node.content
        .map((child) => normalizeBlockNode(child, true))
        .filter((child): child is JSONContent => child !== null)
    : [];

  return {
    type: 'listItem',
    content: normalizedContent.length > 0 ? normalizedContent : [{ type: 'paragraph' }],
  };
}

function normalizeList(node: JSONContent, type: 'bulletList' | 'orderedList'): JSONContent | null {
  const content = Array.isArray(node.content)
    ? node.content
        .map((child) => (child.type === 'listItem' ? normalizeListItem(child) : null))
        .filter((child): child is JSONContent => child !== null)
    : [];

  if (content.length === 0) {
    return null;
  }

  return {
    type,
    content,
  };
}

function normalizeInlineNode(node: JSONContent): JSONContent | null {
  if (node.type === 'text') {
    return normalizeTextNode(node);
  }

  if (node.type === 'hardBreak') {
    return { type: 'hardBreak' };
  }

  if (Array.isArray(node.content)) {
    const content = node.content.flatMap(normalizeInlineNode).filter((child): child is JSONContent => child !== null);

    if (content.length === 0) {
      return null;
    }

    if (node.type === 'paragraph') {
      return normalizeParagraph({ ...node, content });
    }
  }

  return null;
}

function normalizeBlockNode(node: JSONContent, insideListItem = false): JSONContent | null {
  switch (node.type) {
    case 'paragraph':
      return normalizeParagraph(node);
    case 'bulletList':
      return normalizeList(node, 'bulletList');
    case 'orderedList':
      return normalizeList(node, 'orderedList');
    case 'listItem':
      return insideListItem ? normalizeListItem(node) : null;
    case 'text':
    case 'hardBreak': {
      const inline = normalizeInlineNode(node);
      if (!inline) {
        return null;
      }

      return {
        type: 'paragraph',
        content: [inline],
      };
    }
    default: {
      if (!Array.isArray(node.content)) {
        return null;
      }

      const content = node.content
        .map((child) => normalizeBlockNode(child, insideListItem))
        .filter((child): child is JSONContent => child !== null);

      if (content.length === 0) {
        return null;
      }

      return insideListItem
        ? { type: 'listItem', content }
        : {
            type: 'doc',
            content,
          };
    }
  }
}

function wrapInlineAsParagraph(nodes: JSONContent[]): JSONContent {
  return {
    type: 'paragraph',
    ...(nodes.length > 0 ? { content: nodes } : {}),
  };
}

function collectMarks(element: Element, inheritedMarks: RichTextMark[]) {
  const marks = [...inheritedMarks];
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'strong') {
    marks.push({ type: 'bold' });
  }

  if (tagName === 'em') {
    marks.push({ type: 'italic' });
  }

  if (tagName === 'u') {
    marks.push({ type: 'underline' });
  }

  return marks;
}

function domNodeToInlineNodes(node: Node, inheritedMarks: RichTextMark[] = []): JSONContent[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (text.length === 0) {
      return [];
    }

    return [
      {
        type: 'text',
        text,
        ...(inheritedMarks.length > 0 ? { marks: inheritedMarks } : {}),
      },
    ];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'br') {
    return [{ type: 'hardBreak' }];
  }

  const marks = collectMarks(element, inheritedMarks);

  return Array.from(element.childNodes).flatMap((child) => domNodeToInlineNodes(child, marks));
}

function elementTextAlign(element: Element) {
  const style = element.getAttribute('style') ?? '';
  const match = style.match(/text-align\s*:\s*(left|center)/i);
  const alignment = match?.[1]?.toLowerCase();

  return alignment && allowedTextAlign.has(alignment) ? alignment : undefined;
}

function domNodeToBlocks(node: Node): JSONContent[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const inlineNodes = domNodeToInlineNodes(node);
    return inlineNodes.length > 0 ? [wrapInlineAsParagraph(inlineNodes)] : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'p') {
    const inlineNodes = Array.from(element.childNodes).flatMap((child) => domNodeToInlineNodes(child));
    const textAlign = elementTextAlign(element);

    return [
      {
        type: 'paragraph',
        ...(textAlign ? { attrs: { textAlign } } : {}),
        ...(inlineNodes.length > 0 ? { content: inlineNodes } : {}),
      },
    ];
  }

  if (tagName === 'ul' || tagName === 'ol') {
    const content = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child) => {
        const blocks = Array.from(child.childNodes).flatMap((grandChild) => domNodeToBlocks(grandChild));
        return {
          type: 'listItem',
          content: blocks.length > 0 ? blocks : [{ type: 'paragraph' }],
        };
      });

    return content.length > 0
      ? [
          {
            type: tagName === 'ul' ? 'bulletList' : 'orderedList',
            content,
          },
        ]
      : [];
  }

  const inlineNodes = Array.from(element.childNodes).flatMap((child) => domNodeToInlineNodes(child));

  return inlineNodes.length > 0 ? [wrapInlineAsParagraph(inlineNodes)] : [];
}

export function createEmptyRichTextDocument(): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
}

export function normalizeRichTextJson(value: JSONContent | null | undefined): JSONContent {
  if (!value || value.type !== 'doc') {
    return createEmptyRichTextDocument();
  }

  const content = Array.isArray(value.content)
    ? value.content
        .map((child) => normalizeBlockNode(child))
        .flatMap((child) =>
          child?.type === 'doc' && Array.isArray(child.content) ? child.content : child ? [child] : [],
        )
        .filter((child): child is JSONContent => child !== null)
    : [];

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

function serializeMarks(text: string, marks: JSONContent[] | undefined) {
  if (!marks || marks.length === 0) {
    return text;
  }

  const wrappers = marks
    .map((mark) => mark.type)
    .filter((type): type is string => typeof type === 'string' && allowedMarkTypes.has(type));

  return wrappers.reduceRight((result, type) => {
    if (type === 'bold') {
      return `<strong>${result}</strong>`;
    }

    if (type === 'italic') {
      return `<em>${result}</em>`;
    }

    return `<u>${result}</u>`;
  }, text);
}

function renderInlineNode(node: JSONContent): string {
  if (node.type === 'hardBreak') {
    return '<br>';
  }

  if (node.type === 'text' && typeof node.text === 'string') {
    return serializeMarks(escapeHtml(node.text), Array.isArray(node.marks) ? node.marks : undefined);
  }

  if (Array.isArray(node.content)) {
    return node.content.map(renderInlineNode).join('');
  }

  return '';
}

function renderBlockNode(node: JSONContent): string {
  if (node.type === 'paragraph') {
    const content = Array.isArray(node.content) ? node.content.map(renderInlineNode).join('') : '';
    const textAlign =
      typeof node.attrs?.textAlign === 'string' && allowedTextAlign.has(node.attrs.textAlign)
        ? ` style="text-align:${node.attrs.textAlign}"`
        : '';
    return `<p${textAlign}>${content}</p>`;
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const tagName = node.type === 'bulletList' ? 'ul' : 'ol';
    const content = Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : '';
    return `<${tagName}>${content}</${tagName}>`;
  }

  if (node.type === 'listItem') {
    const content = Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : '<p></p>';
    return `<li>${content}</li>`;
  }

  return '';
}

export function richTextJsonToHtml(value: JSONContent | null | undefined) {
  const documentNode = normalizeRichTextJson(value);
  return (documentNode.content ?? []).map(renderBlockNode).join('');
}

function textFromInlineNode(node: JSONContent): string {
  if (node.type === 'hardBreak') {
    return '\n';
  }

  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  if (Array.isArray(node.content)) {
    return node.content.map(textFromInlineNode).join('');
  }

  return '';
}

function textFromBlockNode(node: JSONContent, orderedIndex?: number): string {
  if (node.type === 'paragraph') {
    const content = Array.isArray(node.content) ? node.content.map(textFromInlineNode).join('') : '';
    return content.trimEnd();
  }

  if (node.type === 'listItem') {
    const children = Array.isArray(node.content) ? node.content : [];
    const childText = children.map((child) => textFromBlockNode(child)).filter(Boolean).join('\n').trim();

    if (!childText) {
      return '';
    }

    if (typeof orderedIndex === 'number') {
      return `${orderedIndex}. ${childText}`;
    }

    return `- ${childText}`;
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const children = Array.isArray(node.content) ? node.content : [];
    return children
      .map((child, index) => textFromBlockNode(child, node.type === 'orderedList' ? index + 1 : undefined))
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

export function richTextJsonToText(value: JSONContent | null | undefined) {
  const documentNode = normalizeRichTextJson(value);
  return (documentNode.content ?? [])
    .map((node) => textFromBlockNode(node))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function deriveRichTextValue(value: JSONContent | null | undefined): RichTextDerivedValue {
  const json = normalizeRichTextJson(value);

  return {
    json,
    html: richTextJsonToHtml(json),
    text: richTextJsonToText(json),
  };
}

export function createListRichTextDocument(items: string[], ordered = false): JSONContent {
  const content = items
    .map((item) => stripHtml(item))
    .filter((item) => item.length > 0)
    .map((item) => ({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: item }],
        },
      ],
    }));

  if (content.length === 0) {
    return createEmptyRichTextDocument();
  }

  return {
    type: 'doc',
    content: [
      {
        type: ordered ? 'orderedList' : 'bulletList',
        content,
      },
    ],
  };
}

export function htmlToRichTextJson(html: string): JSONContent {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return createEmptyRichTextDocument();
  }

  const sourceDocument = new DOMParser().parseFromString(html, 'text/html');
  const content = Array.from(sourceDocument.body.childNodes).flatMap((child) => domNodeToBlocks(child));

  return normalizeRichTextJson({
    type: 'doc',
    content,
  });
}

export function isRichTextEmpty(html: string) {
  return richTextJsonToText(htmlToRichTextJson(html)).length === 0;
}

export function normalizeRichTextHtml(html: string) {
  return richTextJsonToHtml(htmlToRichTextJson(html));
}

export function createRichTextMarkup(html: string) {
  return { __html: normalizeRichTextHtml(html) };
}
