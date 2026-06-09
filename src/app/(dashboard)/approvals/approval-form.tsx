"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createApproval, type ApprovalInput } from "./actions"
import { FORM_LABEL } from "./labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const FIELD =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
const LEAVE_TYPES = ["연차", "오전반차", "오후반차", "반반차", "병가", "경조사", "공가", "무급"]

export function ApprovalForm({ today }: { today: string }) {
  const router = useRouter()
  const [formType, setFormType] = useState("leave")
  const [title, setTitle] = useState("")
  // leave
  const [leaveType, setLeaveType] = useState("연차")
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [days, setDays] = useState("1")
  const [reason, setReason] = useState("")
  // expense / purchase
  const [amount, setAmount] = useState("")
  const [vendor, setVendor] = useState("")
  const [purpose, setPurpose] = useState("")
  const [item, setItem] = useState("")
  // general
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit() {
    let content: Record<string, unknown> = {}
    if (formType === "leave")
      content = { leave_type: leaveType, start_date: startDate, end_date: endDate, days: Number(days) || 1, reason }
    else if (formType === "expense") content = { amount: Number(amount) || 0, vendor, purpose }
    else if (formType === "purchase") content = { item, amount: Number(amount) || 0, reason }
    else content = { body }

    const input: ApprovalInput = { form_type: formType, title, content }
    setPending(true)
    const res = await createApproval(input)
    setPending(false)
    if (res?.ok) {
      toast.success("상신되었습니다.")
      router.push(`/approvals/${res.id}`)
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="a-type">문서 종류</Label>
        <select id="a-type" className={FIELD} value={formType} onChange={(e) => setFormType(e.target.value)}>
          <option value="leave">휴가 신청</option>
          <option value="expense">지출 결의</option>
          <option value="purchase">구매 요청</option>
          <option value="general">일반 기안</option>
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="a-title">제목</Label>
        <Input
          id="a-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={FORM_LABEL[formType]}
        />
      </div>

      {formType === "leave" && (
        <div className="grid gap-4 rounded-lg border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="a-lt">휴가 종류</Label>
              <select id="a-lt" className={FIELD} value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="a-days">일수</Label>
              <Input id="a-days" type="number" step="0.25" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="a-sd">시작일</Label>
              <Input id="a-sd" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="a-ed">종료일</Label>
              <Input id="a-ed" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-reason">사유</Label>
            <Textarea id="a-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
      )}

      {formType === "expense" && (
        <div className="grid gap-4 rounded-lg border bg-card p-4">
          <div className="grid gap-1.5">
            <Label htmlFor="a-amt">금액 (원)</Label>
            <Input id="a-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-vendor">거래처</Label>
            <Input id="a-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-purpose">용도</Label>
            <Textarea id="a-purpose" rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
        </div>
      )}

      {formType === "purchase" && (
        <div className="grid gap-4 rounded-lg border bg-card p-4">
          <div className="grid gap-1.5">
            <Label htmlFor="a-item">품목</Label>
            <Input id="a-item" value={item} onChange={(e) => setItem(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-pamt">금액 (원)</Label>
            <Input id="a-pamt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-preason">사유</Label>
            <Textarea id="a-preason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
      )}

      {formType === "general" && (
        <div className="grid gap-1.5">
          <Label htmlFor="a-body">내용</Label>
          <Textarea id="a-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "상신 중…" : "상신"}
        </Button>
      </div>
    </div>
  )
}
