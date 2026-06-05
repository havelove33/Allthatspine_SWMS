"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPost, updatePost, type PostInput } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichEditor } from "@/components/editor/rich-editor"

const FIELD =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export interface PostInitial {
  category: string
  title: string
  body: string
  is_pinned: boolean
  is_required: boolean
  is_popup: boolean
  publish_at: string | null
}

export function PostForm({
  isAdmin,
  postId,
  initial,
}: {
  isAdmin: boolean
  postId?: string
  initial?: PostInitial
}) {
  const router = useRouter()
  const [category, setCategory] = useState(initial?.category ?? "자유")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [pinned, setPinned] = useState(initial?.is_pinned ?? false)
  const [required, setRequired] = useState(initial?.is_required ?? false)
  const [popup, setPopup] = useState(initial?.is_popup ?? false)
  const [publishAt, setPublishAt] = useState(initial?.publish_at ? initial.publish_at.slice(0, 16) : "")
  const [pending, setPending] = useState(false)

  async function onSubmit() {
    if (!title.trim()) {
      toast.error("제목을 입력하세요.")
      return
    }
    setPending(true)
    const input: PostInput = {
      category,
      title,
      body,
      is_pinned: pinned,
      is_required: required,
      is_popup: popup,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
    }
    const res = postId ? await updatePost(postId, input) : await createPost(input)
    setPending(false)
    if (res?.ok) {
      toast.success("저장되었습니다.")
      const id = postId ?? ("id" in res ? res.id : "")
      router.push(`/board/${id}`)
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  const isNotice = category === "공지"
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className={FIELD} value={category} onChange={(e) => setCategory(e.target.value)}>
          {isAdmin && <option value="공지">공지</option>}
          <option value="자유">자유</option>
          <option value="건의">건의(익명)</option>
        </select>
        <Input
          className="min-w-[200px] flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
        />
      </div>
      {category === "건의" && (
        <p className="text-xs text-muted-foreground">
          건의글은 작성자가 익명으로 표시되며 관리자만 열람합니다.
        </p>
      )}
      <RichEditor value={body} onChange={setBody} />
      {isAdmin && isNotice && (
        <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 p-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            상단 고정
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            필독(전 직원 알림)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={popup} onChange={(e) => setPopup(e.target.checked)} />
            로그인 팝업
          </label>
          <label className="flex items-center gap-1.5">
            예약발행
            <input
              type="datetime-local"
              className={FIELD}
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  )
}
