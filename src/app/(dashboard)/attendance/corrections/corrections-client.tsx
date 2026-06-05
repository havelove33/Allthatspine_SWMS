"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { requestCorrection, approveCorrection, rejectCorrection } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export function CorrectionRequestForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = e.currentTarget
    const res = await requestCorrection(undefined, new FormData(form))
    setPending(false)
    if (res?.ok) {
      toast.success("정정을 요청했습니다.")
      form.reset()
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <h2 className="font-semibold">출퇴근 정정 요청</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="cd">날짜</Label>
          <Input id="cd" name="work_date" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ct">구분</Label>
          <select id="ct" name="request_type" className={SELECT_CLS} defaultValue="출근">
            <option value="출근">출근 시각</option>
            <option value="퇴근">퇴근 시각</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ctime">정정 시각</Label>
          <Input id="ctime" name="time" type="time" required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="creason">사유 *</Label>
        <Textarea id="creason" name="reason" rows={2} placeholder="예: 외근으로 출근 체크 누락" required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "요청 중…" : "정정 요청"}
      </Button>
    </form>
  )
}

export function CorrectionApproveButtons({ id }: { id: string }) {
  const [pending, setPending] = useState<null | "a" | "r">(null)

  async function act(kind: "a" | "r") {
    setPending(kind)
    const res = kind === "a" ? await approveCorrection(id) : await rejectCorrection(id)
    setPending(null)
    if (res?.ok) toast.success(kind === "a" ? "승인·반영했습니다." : "반려했습니다.")
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
