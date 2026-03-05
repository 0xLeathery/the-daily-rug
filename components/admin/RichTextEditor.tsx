'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useImperativeHandle, forwardRef } from 'react'
import type { Editor } from '@tiptap/core'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
}

export interface RichTextEditorRef {
  setContent: (html: string) => void
}

type ToolbarButton = {
  label: string
  action: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
}

const toolbarButtons: ToolbarButton[] = [
  {
    label: 'B',
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
  },
  {
    label: 'I',
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
  },
  {
    label: 'H1',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    label: 'H2',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    label: 'H3',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
  },
  {
    label: 'BULLETS',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
  },
  {
    label: 'NUMBERS',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
  },
  {
    label: 'QUOTE',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
  },
  {
    label: 'UNDO',
    action: (editor) => editor.chain().focus().undo().run(),
  },
  {
    label: 'REDO',
    action: (editor) => editor.chain().focus().redo().run(),
  },
]

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
      ],
      content,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
    })

    useImperativeHandle(ref, () => ({
      setContent: (html: string) => {
        editor?.commands.setContent(html)
      },
    }))

    return (
      <div className="border border-brand-red">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-brand-red bg-brand-black">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => editor && btn.action(editor)}
              className={`px-2 py-1 text-sm uppercase font-display text-brand-white hover:bg-brand-red transition-colors ${
                editor && btn.isActive?.(editor)
                  ? 'bg-brand-red text-brand-white'
                  : ''
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className="min-h-[300px] p-4 text-brand-white prose prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
        />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
