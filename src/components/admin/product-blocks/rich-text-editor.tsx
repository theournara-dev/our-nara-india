"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * Rich text editor for DETAIL `rich-text` blocks. Outputs HTML, which is
 * sanitized server-side on save (`normalizeBlockConfig`).
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] w-full px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none " +
          "[&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold " +
          "[&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-200 [&_blockquote]:pl-3",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync when the surrounding form loads a different block.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[140px] rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-zinc-200 bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn =
    "h-7 min-w-7 rounded px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 data-[active=true]:bg-point-500 data-[active=true]:text-white";
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5">
      <button
        type="button"
        data-active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn}
      >
        B
      </button>
      <button
        type="button"
        data-active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} italic`}
      >
        I
      </button>
      <button
        type="button"
        data-active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${btn} line-through`}
      >
        S
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-200" />
      <button
        type="button"
        data-active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn}
      >
        H2
      </button>
      <button
        type="button"
        data-active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn}
      >
        H3
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-200" />
      <button
        type="button"
        data-active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn}
      >
        • List
      </button>
      <button
        type="button"
        data-active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn}
      >
        1. List
      </button>
      <button
        type="button"
        data-active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn}
      >
        Quote
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-200" />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        className={btn}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        className={btn}
      >
        Redo
      </button>
    </div>
  );
}
