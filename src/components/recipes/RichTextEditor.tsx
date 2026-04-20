import type { Editor, JSONContent } from '@tiptap/core';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { recipeIconButtonInteractive } from './buttonStyles';
import { RecipeSectionCard } from './RecipeSectionCard';
import {
  deriveRichTextValue,
  normalizeRichTextJson,
  type RichTextDerivedValue,
} from './richTextUtils';

type RichTextEditorVariant = 'ingredients' | 'steps';

type RichTextEditorProps = {
  label: string;
  helperText?: string;
  value: JSONContent;
  onChange: (value: RichTextDerivedValue) => void;
  variant: RichTextEditorVariant;
};

type ToolbarCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'bulletList'
  | 'orderedList'
  | 'alignLeft'
  | 'alignCenter';

type ToolbarGroup = Array<{
  command: ToolbarCommand;
  label: string;
  icon: () => React.JSX.Element;
  isActive: (editor: Editor | null) => boolean;
  run: (editor: Editor | null) => void;
}>;

const editorSize = {
  ingredients: {
    frameHeight: 'h-[230px]',
    contentMinHeight: 'min-h-[180px]',
  },
  steps: {
    frameHeight: 'h-[290px]',
    contentMinHeight: 'min-h-[240px]',
  },
} as const;

function BoldIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 3.25H9.125C10.5747 3.25 11.75 4.42525 11.75 5.875C11.75 7.32475 10.5747 8.5 9.125 8.5H5V3.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M5 8.5H9.75C11.2688 8.5 12.5 9.73122 12.5 11.25C12.5 12.7688 11.2688 14 9.75 14H5V8.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M9.667 2.667H6.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 13.333H5.667" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9.667 2.667L6.333 13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5.333 2.667V7.333C5.333 8.806 6.527 10 8 10C9.473 10 10.667 8.806 10.667 7.333V2.667"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M4 13H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <path d="M6 4H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 8H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 12H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M2.5 3.333H4.167V6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 10.333C2.5 9.781 2.948 9.333 3.5 9.333H4.167V12H2.5L4.167 9.333"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.667 4H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6.667 8H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6.667 12H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M2.667 4H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.667 7.333H10.667" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.667 10.667H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.667 14H10.667" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M2.667 4H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 7.333H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.667 10.667H13.333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 14H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const toolbarGroups: ToolbarGroup[] = [
  [
    {
      command: 'bold',
      label: '\u52a0\u7c97',
      icon: BoldIcon,
      isActive: (editor) => !!editor?.isActive('bold'),
      run: (editor) => editor?.chain().focus().toggleBold().run(),
    },
    {
      command: 'italic',
      label: '\u659c\u4f53',
      icon: ItalicIcon,
      isActive: (editor) => !!editor?.isActive('italic'),
      run: (editor) => editor?.chain().focus().toggleItalic().run(),
    },
    {
      command: 'underline',
      label: '\u4e0b\u5212\u7ebf',
      icon: UnderlineIcon,
      isActive: (editor) => !!editor?.isActive('underline'),
      run: (editor) => editor?.chain().focus().toggleUnderline().run(),
    },
  ],
  [
    {
      command: 'bulletList',
      label: '\u65e0\u5e8f\u5217\u8868',
      icon: BulletListIcon,
      isActive: (editor) => !!editor?.isActive('bulletList'),
      run: (editor) => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      command: 'orderedList',
      label: '\u6709\u5e8f\u5217\u8868',
      icon: OrderedListIcon,
      isActive: (editor) => !!editor?.isActive('orderedList'),
      run: (editor) => editor?.chain().focus().toggleOrderedList().run(),
    },
  ],
  [
    {
      command: 'alignLeft',
      label: '\u5de6\u5bf9\u9f50',
      icon: AlignLeftIcon,
      isActive: (editor) => !!editor?.isActive({ textAlign: 'left' }),
      run: (editor) => editor?.chain().focus().setTextAlign('left').run(),
    },
    {
      command: 'alignCenter',
      label: '\u5c45\u4e2d\u5bf9\u9f50',
      icon: AlignCenterIcon,
      isActive: (editor) => !!editor?.isActive({ textAlign: 'center' }),
      run: (editor) => editor?.chain().focus().setTextAlign('center').run(),
    },
  ],
];

function serializeDocument(value: JSONContent) {
  return JSON.stringify(normalizeRichTextJson(value));
}

export function RichTextEditor({
  label,
  helperText,
  value,
  onChange,
  variant,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      TextAlign.configure({
        types: ['paragraph'],
      }),
    ],
    content: normalizeRichTextJson(value),
    editorProps: {
      attributes: {
        class: [
          'recipe-rich-text-editor',
          editorSize[variant].contentMinHeight,
          'px-[16px]',
          'py-[14px]',
          'text-[16px]',
          'leading-7',
          'text-[#2D2520]',
          'outline-none',
        ].join(' '),
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
      },
    },
    onUpdate({ editor: nextEditor }) {
      onChange(deriveRichTextValue(nextEditor.getJSON() as JSONContent));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = normalizeRichTextJson(value);
    const currentValue = normalizeRichTextJson(editor.getJSON() as JSONContent);

    if (serializeDocument(nextValue) !== serializeDocument(currentValue)) {
      editor.commands.setContent(nextValue, {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  return (
    <RecipeSectionCard className="gap-0 p-[24px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-[18px] font-semibold leading-7 text-[#2D2520]">{label}</h2>
        {helperText ? <p className="text-[14px] leading-5 text-[#827971]">{helperText}</p> : null}
      </div>

      <div
        className={`mt-4 overflow-hidden rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white ${editorSize[variant].frameHeight}`}
      >
        <div className="flex h-12 items-center bg-[rgba(254,244,237,0.5)] px-2">
          {toolbarGroups.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="flex items-center">
              {group.map((item) => {
                const Icon = item.icon;
                const active = item.isActive(editor);

                return (
                  <button
                    key={item.command}
                    type="button"
                    aria-label={item.label}
                    title={item.label}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      item.run(editor);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-[#6D645C] ${
                      active ? 'bg-[#FDE8DD] text-[#2D2520]' : ''
                    } ${recipeIconButtonInteractive}`}
                  >
                    <Icon />
                  </button>
                );
              })}
              {groupIndex < toolbarGroups.length - 1 ? (
                <div className="mx-2 h-6 w-px bg-[rgba(45,37,32,0.1)]" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="border-t border-[rgba(45,37,32,0.1)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </RecipeSectionCard>
  );
}
