'use client';

import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CodeBlock from '@tiptap/extension-code-block';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxVisibleChars?: number;
  onOverflow?: (currentCount: number) => void;
};

const toolbarButtonBase =
  'h-8 w-8 grid place-items-center text-sm hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

const toolbarButton = (isActive: boolean) =>
  `${toolbarButtonBase} ${isActive ? 'bg-gray-100' : ''}`;

export default function RichTextEditor({ value, onChange, placeholder, maxVisibleChars, onOverflow }: RichTextEditorProps) {
  const lastAcceptedHtmlRef = useRef<string>(value || '');

  const getVisibleTextLength = (html: string): number => {
    const el = document.createElement('div');
    el.innerHTML = html || '';
    const text = el.textContent || '';
    return text.length;
  };
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlock,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Underline,
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Write your description…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg focus:outline-none min-h-[160px] p-3',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (maxVisibleChars !== undefined) {
        const visibleLen = getVisibleTextLength(html);
        if (visibleLen > maxVisibleChars) {
          // Revert to last accepted state without emitting update
          editor.commands.setContent(lastAcceptedHtmlRef.current, { emitUpdate: false });
          if (onOverflow) onOverflow(visibleLen);
          return;
        }
      }
      lastAcceptedHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    lastAcceptedHtmlRef.current = value || '';
    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const handleToggle = (action: () => void) => {
    action();
  };

  const handleAlign = (align: 'left' | 'center' | 'right') => {
    // Prefer TextAlign command if available
    const anyEditor = editor as unknown as { chain: () => any; commands: Record<string, any> };
    if (anyEditor?.commands && typeof anyEditor.commands['setTextAlign'] === 'function') {
      anyEditor.chain().focus().setTextAlign(align).run();
      return;
    }
    // Fallback: update attributes on paragraph and heading nodes
    editor.chain().focus()
      .updateAttributes('paragraph', { textAlign: align })
      .updateAttributes('heading', { textAlign: align })
      .run();
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
        {/* Block selector */}
        <div className="inline-flex items-center gap-0 rounded-md border border-gray-200 bg-white overflow-hidden">
          <select
            aria-label="Block style"
            className="h-8 bg-white px-2 text-sm outline-none"
            value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'p') {
                editor.chain().focus().setParagraph().run();
              } else if (v === 'h1') {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              } else if (v === 'h2') {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
              } else if (v === 'h3') {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
              }
            }}
          >
            <option value="p">Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        {/* Inline marks + Link */}
        <div className="inline-flex items-center rounded-md border border-gray-200 bg-white overflow-hidden">
          <button type="button" aria-label="Bold" title="Bold (Ctrl/Cmd+B)"
            className={`${toolbarButton(editor.isActive('bold'))} not-first:border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleBold().run())}><span className="font-semibold">B</span></button>
          <button type="button" aria-label="Italic" title="Italic (Ctrl/Cmd+I)"
            className={`${toolbarButton(editor.isActive('italic'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleItalic().run())}><span className="italic">I</span></button>
          <button type="button" aria-label="Underline" title="Underline (Ctrl/Cmd+U)"
            className={`${toolbarButton(editor.isActive('underline'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleUnderline().run())}><span className="underline">U</span></button>
          <button type="button" aria-label="Strikethrough" title="Strikethrough"
            className={`${toolbarButton(editor.isActive('strike'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleStrike().run())}><span className="line-through">S</span></button>
          <button type="button" aria-label="Inline code" title="Inline code"
            className={`${toolbarButton(editor.isActive('code'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleCode().run())}>{'</>'}</button>
          <button type="button" aria-label="Insert link" title="Insert link"
            className={`${toolbarButton(false)} border-l px-0.5`}
            onClick={() => {
              const previousUrl = editor.getAttributes('link').href as string | undefined;
              const url = window.prompt('URL', previousUrl || 'https://');
              if (url === null) return;
              if (url === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                return;
              }
              editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
            }}>🔗</button>
        </div>

        {/* Lists & Block */}
        <div className="inline-flex items-center rounded-md border border-gray-200 bg-white overflow-hidden">
          <button type="button" aria-label="Bullet List" title="Bullet List"
            className={`${toolbarButton(editor.isActive('bulletList'))} px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleBulletList().run())}>•</button>
          <button type="button" aria-label="Ordered List" title="Ordered List"
            className={`${toolbarButton(editor.isActive('orderedList'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleOrderedList().run())}>1.</button>
          <button type="button" aria-label="Blockquote" title="Blockquote"
            className={`${toolbarButton(editor.isActive('blockquote'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleBlockquote().run())}>“”</button>
          <button type="button" aria-label="Code block" title="Code block"
            className={`${toolbarButton(editor.isActive('codeBlock'))} border-l px-0.5`}
            onClick={() => handleToggle(() => editor.chain().focus().toggleCodeBlock().run())}>{'{ }'}</button>
          <button type="button" aria-label="Horizontal rule" title="Horizontal rule"
            className={`${toolbarButton(false)} border-l px-0.5`}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</button>
        </div>

        {/* Alignment */}
        <div className="inline-flex items-center rounded-md border border-gray-200 bg-white overflow-hidden">
          <button type="button" aria-label="Align left" title="Align left"
            className={`${toolbarButton(editor.isActive({ textAlign: 'left' }))} px-0.5`}
            onClick={() => handleAlign('left')}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h14"/>
              <path d="M3 12h10"/>
              <path d="M3 18h14"/>
            </svg>
          </button>
          <button type="button" aria-label="Align center" title="Align center"
            className={`${toolbarButton(editor.isActive({ textAlign: 'center' }))} border-l px-0.5`}
            onClick={() => handleAlign('center')}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 6h14"/>
              <path d="M7 12h10"/>
              <path d="M5 18h14"/>
            </svg>
          </button>
          <button type="button" aria-label="Align right" title="Align right"
            className={`${toolbarButton(editor.isActive({ textAlign: 'right' }))} border-l px-0.5`}
            onClick={() => handleAlign('right')}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 6h14"/>
              <path d="M11 12h10"/>
              <path d="M7 18h14"/>
            </svg>
          </button>
        </div>

        {/* History */}
        <div className="inline-flex items-center rounded-md border border-gray-200 bg-white overflow-hidden ml-auto">
          <button type="button" aria-label="Undo" title="Undo"
            className={`${toolbarButton(false)} px-0.5`}
            onClick={() => editor.chain().focus().undo().run()}>↶</button>
          <button type="button" aria-label="Redo" title="Redo"
            className={`${toolbarButton(false)} border-l px-0.5`}
            onClick={() => editor.chain().focus().redo().run()}>↷</button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
