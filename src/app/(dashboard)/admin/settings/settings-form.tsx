"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { updateSettings } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CompanySettings } from "@/types"

export function SettingsForm({ settings }: { settings: CompanySettings }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await updateSettings(undefined, new FormData(e.currentTarget))
    setPending(false)
    if (res?.ok) toast.success("저장되었습니다.")
    else setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">근무 시간</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ws">출근 기준시각</Label>
            <Input id="ws" name="work_start_time" type="time" defaultValue={settings.work_start_time.slice(0, 5)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="we">퇴근 기준시각</Label>
            <Input id="we" name="work_end_time" type="time" defaultValue={settings.work_end_time.slice(0, 5)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grace">지각 유예(분)</Label>
            <Input id="grace" name="late_grace_minutes" type="number" min="0" max="120" defaultValue={String(settings.late_grace_minutes)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rd">일일보고 마감시각</Label>
            <Input id="rd" name="report_deadline_time" type="time" defaultValue={settings.report_deadline_time.slice(0, 5)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-1 font-semibold">허용 IP 대역</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          출퇴근 체크가 가능한 회사 IP 범위입니다. 한 줄에 하나씩(CIDR), 예: <code>203.0.113.0/24</code>
        </p>
        <Textarea
          name="allowed_ip_ranges"
          rows={4}
          defaultValue={(settings.allowed_ip_ranges ?? []).join("\n")}
          placeholder="203.0.113.0/24"
          className="font-mono text-sm"
        />
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ 현재 값 <code>192.168.101.0/24</code>는 임시(사설 IP)입니다. 배포 후 실제
          작동하려면 회사 인터넷의 <b>공인 IP 대역</b>으로 교체하세요. (로컬 개발 중에는 IP 검증이
          생략됩니다.)
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "설정 저장"}
      </Button>
    </form>
  )
}
