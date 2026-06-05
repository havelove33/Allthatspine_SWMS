"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { createMission } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}
function weekRange() {
  const now = new Date(Date.now() + 9 * 3600 * 1000)
  const day = now.getUTCDay() || 7
  const mon = new Date(now)
  mon.setUTCDate(now.getUTCDate() - day + 1)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)] as const
}
function monthRange() {
  const t = kstToday()
  const ym = t.slice(0, 7)
  const last = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0))
  return [`${ym}-01`, last.toISOString().slice(0, 10)] as const
}

export function CreateMissionButton({
  isAdmin,
  employees,
  projects,
}: {
  isAdmin: boolean
  employees: { id: string; name: string }[]
  projects: { id: string; name: string; tag: string | null }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [employeeId, setEmployeeId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [periodType, setPeriodType] = useState("weekly")
  const [start, setStart] = useState(weekRange()[0])
  const [end, setEnd] = useState(weekRange()[1])
  const [title, setTitle] = useState("")
  const [target, setTarget] = useState("")
  const [criteria, setCriteria] = useState("")
  const [priority, setPriority] = useState("중")

  function changePeriodType(t: string) {
    setPeriodType(t)
    if (t === "daily") {
      const today = kstToday()
      setStart(today)
      setEnd(today)
      return
    }
    if (t === "ongoing") {
      setStart(kstToday())
      return
    }
    const [s, e] = t === "monthly" ? monthRange() : weekRange()
    setStart(s)
    setEnd(e)
  }

  function reset() {
    setError(null)
    setTitle("")
    setTarget("")
    setCriteria("")
    setEmployeeId("")
    setProjectId("")
  }

  async function onSubmit() {
    setPending(true)
    setError(null)
    const res = await createMission({
      employeeId: isAdmin ? employeeId || undefined : undefined,
      projectId,
      periodType,
      periodStart: start,
      periodEnd: periodType === "ongoing" ? "" : periodType === "daily" ? start : end,
      title,
      targetMetric: target,
      achievementCriteria: criteria,
      priority,
    })
    setPending(false)
    if (res?.ok) {
      toast.success("나의 업무를 등록했습니다.")
      setOpen(false)
      reset()
      router.push(`/missions/${res.id}`)
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />새 업무
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) reset()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>나의 업무 등록</DialogTitle>
            <DialogDescription>주간·월간 목표를 측정 가능하게 작성하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isAdmin && (
              <div className="grid gap-2">
                <Label>대상 직원</Label>
                <select className={SELECT_CLS} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="">본인</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>기간</Label>
                <select className={SELECT_CLS} value={periodType} onChange={(e) => changePeriodType(e.target.value)}>
                  <option value="daily">일일</option>
                  <option value="weekly">주간</option>
                  <option value="monthly">월간</option>
                  <option value="ongoing">기한 없음</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>{periodType === "daily" ? "날짜" : "시작일"}</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              {periodType !== "ongoing" && periodType !== "daily" && (
                <div className="grid gap-2">
                  <Label>종료일</Label>
                  <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>연관 프로젝트 *</Label>
              <select className={SELECT_CLS} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">프로젝트 선택</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.tag})
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="text-xs text-amber-600">
                  등록된 프로젝트가 없습니다. 관리자가 프로젝트 태그를 먼저 등록해야 합니다.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>제목 *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 병원 거래처 신규 컨택" />
            </div>
            <div className="grid gap-2">
              <Label>측정 가능한 목표 *</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="예: 5곳 / 100% / 매출 OOO" />
            </div>
            <div className="grid gap-2">
              <Label>달성 기준</Label>
              <Textarea rows={2} value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="예: 계약서 발송까지 완료 시 달성" />
            </div>
            <div className="grid max-w-[120px] gap-2">
              <Label>우선순위</Label>
              <select className={SELECT_CLS} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {["상", "중", "하"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={onSubmit} disabled={pending}>
              {pending ? "등록 중…" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
