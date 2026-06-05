"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, X, Undo2, Printer } from "lucide-react"
import { decideApproval, withdrawApproval, addApprovalComment } from "../actions"
import { ApprovalDocument } from "../approval-document"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Approval = {
  id: string
  form_type: string
  title: string
  content: Record<string, unknown>
  status: string
  reject_reason: string | null
  applicant_id: string
  applicantName: string
  deciderName: string | null
  decided_at: string | null
  created_at: string
}
type Comment = { id: string; content: string; created_at: string; authorName: string }

export function ApprovalDetail({
  isAdmin,
  meId,
  approval,
  comments,
  sealUrl,
  signatureUrl,
}: {
  isAdmin: boolean
  meId: string
  approval: Approval
  comments: Comment[]
  sealUrl?: string | null
  signatureUrl?: string | null
}) {
  const router = useRouter()
  const a = approval
  const [reason, setReason] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)

  const canDecide = isAdmin && a.status === "대기"
  const canWithdraw = a.applicant_id === meId && a.status === "대기"

  async function decide(decision: "승인" | "반려") {
    setBusy(true)
    const res = await decideApproval(a.id, decision, decision === "반려" ? reason : undefined)
    setBusy(false)
    if (res?.ok) {
      toast.success(`${decision}되었습니다.`)
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function withdraw() {
    if (!confirm("이 문서를 회수할까요?")) return
    const res = await withdrawApproval(a.id)
    if (res?.ok) {
      toast.success("회수되었습니다.")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function addCmt() {
    if (!comment.trim()) return
    setBusy(true)
    const res = await addApprovalComment(a.id, comment)
    setBusy(false)
    if (res?.ok) {
      setComment("")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  return (
    <div className="mx-auto max-w-[210mm]">
      {/* 액션 바 (인쇄 시 숨김) */}
      <div className="mb-3 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          인쇄 / PDF
        </Button>
        {canWithdraw && (
          <Button variant="outline" size="sm" onClick={withdraw}>
            <Undo2 className="size-4" />
            회수
          </Button>
        )}
      </div>

      {/* 결재 문서 (A4 세로) */}
      <div className="overflow-x-auto">
        <ApprovalDocument
          sealUrl={sealUrl}
          signatureUrl={signatureUrl}
          approval={{
            id: a.id,
            form_type: a.form_type,
            title: a.title,
            content: a.content,
            status: a.status,
            reject_reason: a.reject_reason,
            applicantName: a.applicantName,
            deciderName: a.deciderName,
            decided_at: a.decided_at,
            created_at: a.created_at,
          }}
        />
      </div>

      {/* 결재 액션 */}
      {canDecide && (
        <div className="mt-4 rounded-lg border bg-card p-4">
          {!showReject ? (
            <div className="flex gap-2">
              <Button onClick={() => decide("승인")} disabled={busy}>
                <Check className="size-4" />
                승인
              </Button>
              <Button variant="outline" onClick={() => setShowReject(true)} disabled={busy}>
                <X className="size-4" />
                반려
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="반려 사유를 입력하세요 (필수)"
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => decide("반려")} disabled={busy || !reason.trim()}>
                  반려 확정
                </Button>
                <Button variant="outline" onClick={() => setShowReject(false)}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 코멘트 */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">코멘트 {comments.length}</h2>
        <div className="mb-3 flex gap-2">
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="코멘트를 남기세요"
          />
          <Button onClick={addCmt} disabled={busy || !comment.trim()}>
            등록
          </Button>
        </div>
        <div className="space-y-2">
          {comments.map((cm) => (
            <div key={cm.id} className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{cm.authorName}</span> ·{" "}
                {cm.created_at.slice(5, 16).replace("T", " ")}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{cm.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">코멘트가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
