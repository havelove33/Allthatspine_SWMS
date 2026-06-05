"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import DOMPurify from "isomorphic-dompurify"
import { Pencil, Trash2, CornerDownRight } from "lucide-react"
import {
  addComment,
  deleteComment,
  deletePost,
  toggleReaction,
  markRead,
} from "../actions"
import { PostForm } from "../post-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"]

type Comment = {
  id: string
  author_id: string
  authorName: string
  parent_comment_id: string | null
  content: string
  created_at: string
  canDelete: boolean
}
type Post = {
  id: string
  category: string
  title: string
  body: string | null
  authorName: string
  author_id: string
  is_pinned: boolean
  is_required: boolean
  is_popup: boolean
  publish_at: string | null
  created_at: string
}

export function PostDetail({
  isAdmin,
  post,
  canEdit,
  comments,
  reactions,
  readInfo,
}: {
  isAdmin: boolean
  post: Post
  canEdit: boolean
  comments: Comment[]
  reactions: { emoji: string; count: number; mine: boolean }[]
  readInfo?: { read: number; total: number }
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void markRead(post.id)
  }, [post.id])

  if (editing) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">게시글 수정</h1>
        <PostForm
          isAdmin={isAdmin}
          postId={post.id}
          initial={{
            category: post.category,
            title: post.title,
            body: post.body ?? "",
            is_pinned: post.is_pinned,
            is_required: post.is_required,
            is_popup: post.is_popup,
            publish_at: post.publish_at,
          }}
        />
      </div>
    )
  }

  const reactionMap = new Map(reactions.map((r) => [r.emoji, r]))
  const topComments = comments.filter((c) => !c.parent_comment_id)
  const repliesOf = (id: string) => comments.filter((c) => c.parent_comment_id === id)

  async function onAddComment(content: string, parentId?: string) {
    if (!content.trim()) return
    setBusy(true)
    const res = await addComment(post.id, content, parentId)
    setBusy(false)
    if (res?.ok) {
      setComment("")
      setReplyText("")
      setReplyTo(null)
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  async function onDeleteComment(id: string) {
    if (!confirm("댓글을 삭제할까요?")) return
    const res = await deleteComment(id, post.id)
    if (res?.ok) router.refresh()
    else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function onDeletePost() {
    if (!confirm("이 게시글을 삭제할까요?")) return
    const res = await deletePost(post.id)
    if (res?.ok) {
      toast.success("삭제되었습니다.")
      router.push("/board")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function onReact(emoji: string) {
    await toggleReaction(post.id, emoji)
    router.refresh()
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="secondary">{post.category}</Badge>
            {post.is_required && <Badge className="bg-red-100 text-red-700">필독</Badge>}
            {post.is_pinned && <Badge variant="outline">고정</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {post.authorName} · {post.created_at.slice(0, 16).replace("T", " ")}
            {readInfo && <span className="ml-2">· 읽음 {readInfo.read}/{readInfo.total}</span>}
          </p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              수정
            </Button>
            <Button variant="outline" size="sm" onClick={onDeletePost}>
              <Trash2 className="size-4 text-destructive" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* 본문 */}
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

      {/* 리액션 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => {
          const info = reactionMap.get(e)
          return (
            <button
              key={e}
              onClick={() => onReact(e)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors hover:bg-accent",
                info?.mine && "border-primary bg-primary/10"
              )}
            >
              <span>{e}</span>
              {info && info.count > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">{info.count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 댓글 */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">댓글 {comments.length}</h2>

        <div className="mb-4 flex gap-2">
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="댓글을 입력하세요"
          />
          <Button onClick={() => onAddComment(comment)} disabled={busy || !comment.trim()}>
            등록
          </Button>
        </div>

        <div className="space-y-3">
          {topComments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-3">
              <CommentRow c={c} onDelete={onDeleteComment} onReply={() => setReplyTo(c.id)} />
              {/* 답글 */}
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="mt-2 ml-5 flex gap-2 border-l-2 pl-3">
                  <CornerDownRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <CommentRow c={r} onDelete={onDeleteComment} />
                  </div>
                </div>
              ))}
              {replyTo === c.id && (
                <div className="mt-2 ml-5 flex gap-2">
                  <Textarea
                    rows={1}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="답글…"
                  />
                  <Button size="sm" onClick={() => onAddComment(replyText, c.id)} disabled={busy}>
                    등록
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>
                    취소
                  </Button>
                </div>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">첫 댓글을 남겨보세요.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentRow({
  c,
  onDelete,
  onReply,
}: {
  c: Comment
  onDelete: (id: string) => void
  onReply?: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{c.authorName}</span> ·{" "}
          {c.created_at.slice(5, 16).replace("T", " ")}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {onReply && (
          <button onClick={onReply} className="text-xs text-muted-foreground hover:text-foreground">
            답글
          </button>
        )}
        {c.canDelete && (
          <button onClick={() => onDelete(c.id)} className="text-xs text-destructive hover:underline">
            삭제
          </button>
        )}
      </div>
    </div>
  )
}
