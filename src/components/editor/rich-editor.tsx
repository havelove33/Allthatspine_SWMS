"use client"

import { useEffect, useReducer, useRef } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style"
import { Image } from "@tiptap/extension-image"
import { TextAlign } from "@tiptap/extension-text-align"
import { toast } from "sonner"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImageIcon,
  Paperclip,
  Quote,
} from "lucide-react"
import { uploadFile } from "@/app/(dashboard)/upload-actions"
import { cn } from "@/lib/utils"

const SELECT_CLS =
  "h-8 rounded border border-input bg-transparent px-1.5 text-xs outline-none"

function Btn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded hover:bg-muted",
        active && "bg-primary/15 text-primary"
      )}
    >
      {children}
    </button>
  )
}

export function RichEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [, force] = useReducer((x: number) => x + 1, 0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener" } },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich-content px-4 py-3 min-h-[320px]" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    const update = () => force()
    editor.on("transaction", update)
    return () => {
      editor.off("transaction", update)
    }
  }, [editor])

  if (!editor) {
    return <div className="min-h-[360px] rounded-md border bg-card" />
  }
  const ed: Editor = editor

  async function doUpload(file: File, kind: "image" | "file") {
    const fd = new FormData()
    fd.set("file", file)
    const res = await uploadFile(fd)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    if (kind === "image") {
      ed.chain().focus().setImage({ src: res.url, alt: res.name }).run()
    } else {
      ed.chain()
        .focus()
        .insertContent(
          `<a href="${res.url}" target="_blank" rel="noopener">📎 ${res.name}</a><p></p>`
        )
        .run()
    }
  }

  function addLink() {
    const prev = (ed.getAttributes("link").href as string) || "https://"
    const url = window.prompt("링크 URL을 입력하세요", prev)
    if (url === null) return
    if (url.trim() === "") {
      ed.chain().focus().unsetLink().run()
      return
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run()
  }

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-1.5">
        <select
          className={SELECT_CLS}
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (v) ed.chain().focus().setFontFamily(v).run()
            else ed.chain().focus().unsetFontFamily().run()
            e.target.value = ""
          }}
          title="글꼴"
        >
          <option value="">글꼴</option>
          <option value="sans-serif">기본</option>
          <option value="serif">명조</option>
          <option value="monospace">고정폭</option>
        </select>
        <select
          className={SELECT_CLS}
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (v) ed.chain().focus().setFontSize(v).run()
            else ed.chain().focus().unsetFontSize().run()
            e.target.value = ""
          }}
          title="글자 크기"
        >
          <option value="">크기</option>
          {["12px", "14px", "16px", "18px", "20px", "24px", "32px"].map((s) => (
            <option key={s} value={s}>{s.replace("px", "")}</option>
          ))}
        </select>
        <label
          className="flex size-8 cursor-pointer items-center justify-center rounded hover:bg-muted"
          title="글자 색"
        >
          <span className="size-4 rounded-full border" style={{ background: "conic-gradient(red,orange,yellow,green,blue,violet,red)" }} />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => ed.chain().focus().setColor(e.target.value).run()}
          />
        </label>

        <span className="mx-1 h-5 w-px bg-border" />

        <Btn title="굵게" active={ed.isActive("bold")} onClick={() => ed.chain().focus().toggleBold().run()}><Bold className="size-4" /></Btn>
        <Btn title="기울임" active={ed.isActive("italic")} onClick={() => ed.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Btn>
        <Btn title="밑줄" active={ed.isActive("underline")} onClick={() => ed.chain().focus().toggleUnderline().run()}><Underline className="size-4" /></Btn>
        <Btn title="취소선" active={ed.isActive("strike")} onClick={() => ed.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border" />

        <Btn title="제목1" active={ed.isActive("heading", { level: 1 })} onClick={() => ed.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="size-4" /></Btn>
        <Btn title="제목2" active={ed.isActive("heading", { level: 2 })} onClick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Btn>
        <Btn title="글머리 기호" active={ed.isActive("bulletList")} onClick={() => ed.chain().focus().toggleBulletList().run()}><List className="size-4" /></Btn>
        <Btn title="번호 매기기" active={ed.isActive("orderedList")} onClick={() => ed.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
        <Btn title="인용" active={ed.isActive("blockquote")} onClick={() => ed.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border" />

        <Btn title="왼쪽" active={ed.isActive({ textAlign: "left" })} onClick={() => ed.chain().focus().setTextAlign("left").run()}><AlignLeft className="size-4" /></Btn>
        <Btn title="가운데" active={ed.isActive({ textAlign: "center" })} onClick={() => ed.chain().focus().setTextAlign("center").run()}><AlignCenter className="size-4" /></Btn>
        <Btn title="오른쪽" active={ed.isActive({ textAlign: "right" })} onClick={() => ed.chain().focus().setTextAlign("right").run()}><AlignRight className="size-4" /></Btn>

        <span className="mx-1 h-5 w-px bg-border" />

        <Btn title="링크" active={ed.isActive("link")} onClick={addLink}><Link2 className="size-4" /></Btn>
        <Btn title="이미지 삽입" onClick={() => imgRef.current?.click()}><ImageIcon className="size-4" /></Btn>
        <Btn title="파일 첨부" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /></Btn>
      </div>

      <EditorContent editor={editor} className="tiptap-editor" />

      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) doUpload(f, "image")
          e.target.value = ""
        }}
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) doUpload(f, "file")
          e.target.value = ""
        }}
      />
    </div>
  )
}
