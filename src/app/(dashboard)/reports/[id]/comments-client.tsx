"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CornerDownRight } from "lucide-react"
import { addComment } from "../actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface CommentNode {
  id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  authorName: string
}

function CommentBox({
  reportId,
  parentId,
  placeholder,
  onDone,
}: {
  reportId: string
  parentId?: string
  placeholder: string
  onDone?: () => void
}) {
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!text.trim()) return
    setPending(true)
    const res = await addComment(reportId, text, parentId)
    setPending(false)
    if (res?.ok) {
      setText("")
      onDone?.()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? "등록 중…" : "등록"}
        </Button>
      </div>
    </div>
  )
}

export function CommentThread({
  reportId,
  comments,
}: {
  reportId: string
  comments: CommentNode[]
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const tops = comments.filter((c) => !c.parent_comment_id)
  const repliesOf = (id: string) => comments.filter((c) => c.parent_comment_id === id)

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">코멘트</h2>

      <div className="space-y-3">
        {tops.length === 0 && (
          <p className="text-sm text-muted-foreground">아직 코멘트가 없습니다.</p>
        )}
        {tops.map((c) => (
          <div key={c.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {c.created_at.slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>

            {/* 답글 */}
            <div className="mt-2 space-y-2">
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-4 flex gap-2 border-l pl-3">
                  <CornerDownRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.created_at.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {replyTo === c.id ? (
              <div className="mt-2 ml-4">
                <CommentBox
                  reportId={reportId}
                  parentId={c.id}
                  placeholder="답글을 입력하세요"
                  onDone={() => setReplyTo(null)}
                />
              </div>
            ) : (
              <button
                onClick={() => setReplyTo(c.id)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                답글
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-3">
        <CommentBox reportId={reportId} placeholder="코멘트를 입력하세요" />
      </div>
    </div>
  )
}
