"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"
import DOMPurify from "isomorphic-dompurify"
import { createPost, updatePost, deletePost } from "../../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichEditor } from "@/components/editor/rich-editor"

export function PostEditor({
  projectId,
  postId,
  initialTitle = "",
  initialBody = "",
  onCancel,
}: {
  projectId: string
  postId?: string
  initialTitle?: string
  initialBody?: string
  onCancel?: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [pending, setPending] = useState(false)

  async function onSave() {
    if (!title.trim()) {
      toast.error("제목을 입력하세요.")
      return
    }
    setPending(true)
    const res = postId
      ? await updatePost(postId, projectId, title, body)
      : await createPost(projectId, title, body)
    setPending(false)
    if (res?.ok) {
      toast.success("저장되었습니다.")
      const targetId = postId ?? ("id" in res ? res.id : "")
      if (onCancel) onCancel()
      router.push(`/projects/${projectId}/posts/${targetId}`)
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <div className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="text-base font-medium"
      />
      <RichEditor value={body} onChange={setBody} />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.push(`/projects/${projectId}`))}
        >
          취소
        </Button>
        <Button onClick={onSave} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  )
}

export function PostView({
  projectId,
  post,
  canEdit,
}: {
  projectId: string
  post: { id: string; title: string; body: string | null; authorName: string; created_at: string }
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <PostEditor
        projectId={projectId}
        postId={post.id}
        initialTitle={post.title}
        initialBody={post.body ?? ""}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {post.authorName} · {post.created_at.slice(0, 16).replace("T", " ")}
          </p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              수정
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm("이 게시글을 삭제할까요?")) return
                const res = await deletePost(post.id, projectId)
                if (res?.ok) {
                  toast.success("삭제되었습니다.")
                  router.push(`/projects/${projectId}`)
                } else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
              }}
            >
              <Trash2 className="size-4 text-destructive" />
              삭제
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-lg border bg-card p-5">
        {post.body ? (
          <div
            className="rich-content text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">내용이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
