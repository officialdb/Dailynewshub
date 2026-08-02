"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect, useState } from "react";

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    
    // cancelled
    if (url === null) {
      return;
    }
    
    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    
    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const NavButton = ({ onClick, isActive, icon, title }: { onClick: () => void, isActive: boolean, icon: string, title: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
        isActive
          ? "bg-primary/20 text-primary font-bold"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-10 rounded-t-xl">
      <NavButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        icon="format_bold"
        title="Bold"
      />
      <NavButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        icon="format_italic"
        title="Italic"
      />
      <NavButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        icon="format_strikethrough"
        title="Strikethrough"
      />
      
      <div className="w-px h-5 bg-outline-variant mx-1" />
      
      <NavButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        icon="format_h1"
        title="Heading 1"
      />
      <NavButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        icon="format_h2"
        title="Heading 2"
      />
      
      <div className="w-px h-5 bg-outline-variant mx-1" />
      
      <NavButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        icon="format_list_bulleted"
        title="Bullet List"
      />
      <NavButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        icon="format_list_numbered"
        title="Ordered List"
      />
      <NavButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        icon="format_quote"
        title="Blockquote"
      />
      
      <div className="w-px h-5 bg-outline-variant mx-1" />
      
      <NavButton
        onClick={setLink}
        isActive={editor.isActive("link")}
        icon="link"
        title="Link"
      />
      <NavButton
        onClick={addImage}
        isActive={false}
        icon="image"
        title="Image"
      />
    </div>
  );
};

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary/80 transition-colors",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4 shadow-sm border border-outline-variant",
        },
      }),
    ],
    content: content || (placeholder ? `<p class="text-secondary italic">${placeholder}</p>` : ""),
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[300px] p-4 text-on-surface",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Re-sync content when the prop changes (e.g., editing an existing article)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!mounted) {
    return (
      <div className="border border-outline-variant rounded-xl w-full min-h-[350px] bg-surface-container-lowest animate-pulse" />
    );
  }

  return (
    <div className="border border-outline-variant rounded-xl w-full flex flex-col bg-surface-container-lowest overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto max-h-[600px] editor-content">
        <EditorContent editor={editor} />
      </div>
      
      {/* Basic styles for Tiptap prose to ensure it looks good if Tailwind typography isn't installed */}
      <style dangerouslySetInnerHTML={{__html: `
        .editor-content .ProseMirror p { margin-bottom: 1em; }
        .editor-content .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
        .editor-content .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
        .editor-content .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .editor-content .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
        .editor-content .ProseMirror blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; color: #64748b; font-style: italic; }
      `}} />
    </div>
  );
}
