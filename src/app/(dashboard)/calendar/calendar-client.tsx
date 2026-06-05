"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarOff } from "lucide-react"
import { addEvent, deleteEvent, type EventInput } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type CalEvent = { date: string; kind: string; title: string }
type MyEvent = { id: string; title: string; event_type: string; start_date: string; end_date: string | null }
type Absence = { name: string; leave_type: string; start_date: string; end_date: string }

const FIELD =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
const WD = ["일", "월", "화", "수", "목", "금", "토"]

const KIND: Record<string, { label: string; cls: string }> = {
  holiday: { label: "공휴일", cls: "bg-red-100 text-red-700" },
  leave: { label: "휴가", cls: "bg-amber-100 text-amber-700" },
  milestone: { label: "마일스톤", cls: "bg-teal-100 text-teal-700" },
  deadline: { label: "기한", cls: "bg-rose-100 text-rose-700" },
  mission: { label: "미션", cls: "bg-violet-100 text-violet-700" },
  personal: { label: "개인", cls: "bg-slate-200 text-slate-700" },
  company: { label: "회사", cls: "bg-blue-100 text-blue-700" },
  meeting: { label: "미팅", cls: "bg-green-100 text-green-700" },
  project: { label: "프로젝트", cls: "bg-cyan-100 text-cyan-700" },
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}
function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function CalendarClient({
  events,
  myEvents,
  absences,
  today,
}: {
  events: CalEvent[]
  myEvents: MyEvent[]
  absences: Absence[]
  today: string
}) {
  const router = useRouter()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState("company")
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) {
      const arr = m.get(e.date) ?? []
      arr.push(e)
      m.set(e.date, arr)
    }
    return m
  }, [events])

  const cells = useMemo(() => {
    const [y, mo] = month.split("-").map(Number)
    const first = new Date(y, mo - 1, 1)
    const gridStart = new Date(y, mo - 1, 1 - first.getDay())
    const out: { date: string; inMonth: boolean; dow: number }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      out.push({ date: fmt(d), inMonth: d.getMonth() === mo - 1, dow: d.getDay() })
    }
    return out
  }, [month])

  const [yy, mm] = month.split("-").map(Number)

  function openAdd(date?: string) {
    setTitle("")
    setType("company")
    setStart(date ?? today)
    setEnd("")
    setNote("")
    setOpen(true)
  }

  async function onSave() {
    if (!title.trim()) {
      toast.error("제목을 입력하세요.")
      return
    }
    const input: EventInput = { title, event_type: type, start_date: start, end_date: end || undefined, note }
    setBusy(true)
    const res = await addEvent(input)
    setBusy(false)
    if (res?.ok) {
      toast.success("일정을 추가했습니다.")
      setOpen(false)
      setMonth(start.slice(0, 7))
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function onDelete(id: string) {
    if (!confirm("이 일정을 삭제할까요?")) return
    const res = await deleteEvent(id)
    if (res?.ok) router.refresh()
    else toast.error(res && !res.ok ? res.error : "오류")
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[110px] text-center text-lg font-bold">
          {yy}년 {mm}월
        </span>
        <Button variant="outline" size="icon-sm" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(today.slice(0, 7))}>
          오늘
        </Button>
        <div className="ml-auto">
          <Button size="sm" onClick={() => openAdd()}>
            <Plus className="size-4" />
            일정 추가
          </Button>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium">
          {WD.map((w, i) => (
            <div key={w} className={cn("py-2", i === 0 && "text-red-500", i === 6 && "text-blue-500")}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c) => {
            const evs = byDate.get(c.date) ?? []
            const isToday = c.date === today
            const isHoliday = evs.some((e) => e.kind === "holiday")
            const dayNum = Number(c.date.slice(8, 10))
            return (
              <button
                key={c.date}
                onClick={() => openAdd(c.date)}
                className={cn(
                  "min-h-[88px] border-r border-b p-1 text-left align-top last:border-r-0 hover:bg-accent/30",
                  !c.inMonth && "bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "mb-1 inline-flex size-5 items-center justify-center rounded-full text-xs tabular-nums",
                    !c.inMonth && "text-muted-foreground/50",
                    c.inMonth && c.dow === 0 && "text-red-500",
                    c.inMonth && c.dow === 6 && "text-blue-500",
                    c.inMonth && isHoliday && "text-red-500",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {dayNum}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((e, i) => (
                    <div
                      key={i}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                        KIND[e.kind]?.cls ?? "bg-muted text-foreground"
                      )}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div className="px-1 text-[10px] text-muted-foreground">+{evs.length - 3}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        {Object.entries(KIND).map(([k, v]) => (
          <span key={k} className={cn("rounded px-1.5 py-0.5", v.cls)}>
            {v.label}
          </span>
        ))}
      </div>

      {/* 하단 패널 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* 부재 현황 */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <CalendarOff className="size-4" />
            부재 현황 (예정·진행)
          </h3>
          {absences.length === 0 ? (
            <p className="text-sm text-muted-foreground">예정된 휴가가 없습니다.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {absences.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    {a.leave_type}
                  </span>
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">
                    {a.start_date.slice(5).replace("-", ".")}
                    {a.end_date !== a.start_date && ` ~ ${a.end_date.slice(5).replace("-", ".")}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 내가 등록한 일정 */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">내가 등록한 일정</h3>
          {myEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록한 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {myEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px]", KIND[e.event_type]?.cls)}>
                    {KIND[e.event_type]?.label ?? "일정"}
                  </span>
                  <span className="flex-1 truncate font-medium">{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.start_date.slice(5).replace("-", ".")}
                  </span>
                  <button
                    onClick={() => onDelete(e.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 일정 추가 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>일정 추가</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-title">제목</Label>
              <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="일정 제목" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-type">유형</Label>
              <select id="c-type" className={FIELD} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="company">회사 일정(전체 공개)</option>
                <option value="meeting">미팅</option>
                <option value="personal">개인 일정(나만 보기)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="c-start">시작일</Label>
                <Input id="c-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-end">종료일 (선택)</Label>
                <Input id="c-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-note">메모 (선택)</Label>
              <Textarea id="c-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="-mx-4 -mb-4 mt-1 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={onSave} disabled={busy}>
              {busy ? "저장 중…" : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
