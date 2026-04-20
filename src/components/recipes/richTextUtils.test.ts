import {
  createEmptyRichTextDocument,
  createListRichTextDocument,
  deriveRichTextValue,
  htmlToRichTextJson,
  normalizeRichTextJson,
  richTextJsonToHtml,
  richTextJsonToText,
} from './richTextUtils';

describe('richTextUtils', () => {
  it('normalizes invalid documents into an empty paragraph document', () => {
    expect(normalizeRichTextJson(null)).toEqual(createEmptyRichTextDocument());
    expect(normalizeRichTextJson({ type: 'paragraph' })).toEqual(createEmptyRichTextDocument());
  });

  it('derives html and text from a JSON document', () => {
    const value = deriveRichTextValue(
      createListRichTextDocument(['Egg - 2', 'Milk - 200ml']),
    );

    expect(value.json).toEqual(
      expect.objectContaining({
        type: 'doc',
      }),
    );
    expect(value.html).toContain('<ul>');
    expect(value.html).toContain('<li><p>Egg - 2</p></li>');
    expect(value.text).toContain('- Egg - 2');
    expect(value.text).toContain('- Milk - 200ml');
  });

  it('converts html into tiptap json and back to sanitized html', () => {
    const json = htmlToRichTextJson(
      '<p style="text-align:center"><strong>Hello</strong> <script>alert(1)</script><u>world</u></p>',
    );

    expect(richTextJsonToHtml(json)).toBe(
      '<p style="text-align:center"><strong>Hello</strong> alert(1)<u>world</u></p>',
    );
    expect(richTextJsonToText(json)).toBe('Hello alert(1)world');
  });

  it('renders ordered lists as numbered plain text', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Step one' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Step two' }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(richTextJsonToText(json)).toBe('1. Step one\n2. Step two');
  });
});
