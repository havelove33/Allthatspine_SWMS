"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { requestLeave, approveLeave, rejectLeave } from "./actions"
import { LEAVE_TYPES, leaveTypeDef, computeLeaveDays } from "@/lib/leave"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export function LeaveRequestForm() {
  const [type, setType] = useState("연차")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const def = leaveTypeDef(type)
  const single = !!(def?.half || def?.quarter) // 반차·반반차는 당일만
  const effEnd = single ? start : end || start
  const days = start ? computeLeaveDays(type, start, effEnd) : 0

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await requestLeave(undefined, new FormData(e.currentTarget))
    setPending(false)
    if (res?.ok) {
      toast.success("휴가를 신청했습니다.")
      setStart("")
      setEnd("")
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <h2 className="font-semibold">휴가 신청</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lt">휴가 종류</Label>
          <select
            id="lt"
            name="leave_type"
            className={SELECT_CLS}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>사용 일수</Label>
          <div className="flex h-9 items-center text-sm font-medium">{days}일</div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sd">시작일</Label>
          <Input id="sd" name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ed">종료일</Label>
          <Input
            id="ed"
            name="end_date"
            type="date"
            value={single ? start : end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={single}
            min={start || undefined}
          />
          {single && <p className="text-xs text-muted-foreground">반차·반반차는 당일만 가능합니다.</p>}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lr">사유</Label>
        <Textarea id="lr" name="reason" rows={2} placeholder="(선택) 사유" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "신청 중…" : "휴가 신청"}
      </Button>
    </form>
  )
}

export function LeaveApproveButtons({ leaveId }: { leaveId: string }) {
  const [pending, setPending] = useState<null | "a" | "r">(null)

  async function act(kind: "a" | "r") {
    setPending(kind)
    const res = kind === "a" ? await approveLeave(leaveId) : await rejectLeave(leaveId)
    setPending(null)
    if (res?.ok) toast.success(kind === "a" ? "승인했습니다." : "반려했습니다.")
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" onClick={() => act("a")} disabled={pending !== null}>
        승인
      </Button>
      <Button size="sm" variant="outline" onClick={() => act("r")} disabled={pending !== null}>
        반려
      </Button>
    </div>
  )
}
