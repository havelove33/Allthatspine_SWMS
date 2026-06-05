"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { submitReport } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { TemplateField, ReportType } from "@/types"

interface ProjectOpt {
  id: string
  name: string
  tag: string | null
}

interface TaskItem {
  title: string
  projectId: string
  hours: string
  status: string
}

const TYPE_LABEL: Record<ReportType, string> = {
  daily: "일일",
  weekly: "주간",
  monthly: "월간",
}
const DAILY_STATUS = ["예정", "진행중", "완료", "보류"]
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

const emptyItem = (): TaskItem => ({ title: "", projectId: "", hours: "", status: "진행중" })

export function ReportForm({
  templates,
  projects,
}: {
  templates: Record<string, TemplateField[]>
  projects: ProjectOpt[]
}) {
  const router = useRouter()
  const [type, setType] = useState<ReportType>("daily")
  const [date, setDate] = useState(kstToday())
  const [start, setStart] = useState(weekRange()[0])
  const [end, setEnd] = useState(weekRange()[1])
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [items, setItems] = useState<TaskItem[]>([emptyItem()])
  const [rows, setRows] = useState<{ projectId: string; hours: string }[]>([
    { projectId: "", hours: "" },
  ])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = templates[type] ?? []

  function pickType(t: ReportType) {
    setType(t)
    setContent({})
    setItems([emptyItem()])
    if (t === "weekly") {
      const [s, e] = weekRange()
      setStart(s)
      setEnd(e)
    } else if (t === "monthly") {
      const [s, e] = monthRange()
      setStart(s)
      setEnd(e)
    }
  }

  function setField(key: string, value: unknown) {
    setContent((p) => ({ ...p, [key]: value }))
  }
  function toggleMulti(key: string, opt: string) {
    const arr = Array.isArray(content[key]) ? (content[key] as string[]) : []
    setField(key, arr.includes(opt) ? arr.filter((o) => o !== opt) : [...arr, opt])
  }
  function setItem(idx: number, patch: Partial<TaskItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  async function onSubmit() {
    setPending(true)
    setError(null)

    let inputContent: Record<string, unknown>
    let inputProjects: { projectId: string; hours: number }[]
    if (type === "daily") {
      inputContent = { items }
      inputProjects = items
        .filter((it) => it.projectId)
        .map((it) => ({ projectId: it.projectId, hours: Number(it.hours) || 0 }))
    } else {
      inputContent = content
      inputProjects = rows
        .filter((r) => r.projectId)
        .map((r) => ({ projectId: r.projectId, hours: Number(r.hours) || 0 }))
    }

    const res = await submitReport({
      reportType: type,
      reportDate: type === "daily" ? date : null,
      periodStart: type !== "daily" ? start : null,
      periodEnd: type !== "daily" ? end : null,
      content: inputContent,
      projects: inputProjects,
    })
    setPending(false)
    if (res?.ok) {
      toast.success("보고를 제출했습니다.")
      router.push(`/reports/${res.id}`)
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  const noProjects = projects.length === 0

  return (
    <div className="max-w-2xl space-y-5">
      {/* 유형 */}
      <div className="flex gap-1 rounded-md border p-1">
        {(["daily", "weekly", "monthly"] as ReportType[]).map((t) => (
          <button
            key={t}
            onClick={() => pickType(t)}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-sm font-medium",
              type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {TYPE_LABEL[t]} 보고
          </button>
        ))}
      </div>

      {/* 기간 */}
      <div className="rounded-lg border bg-card p-4">
        {type === "daily" ? (
          <div className="grid max-w-xs gap-2">
            <Label htmlFor="rd">날짜</Label>
            <Input id="rd" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>시작일</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>종료일</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* 일일: 업무 목록 */}
      {type === "daily" ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <Label>오늘 한 업무</Label>
          {items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-md border p-3">
              <Textarea
                rows={3}
                value={it.title}
                onChange={(e) => setItem(idx, { title: e.target.value })}
                placeholder="업무 내용 (예: 거래처 A 견적서 작성)"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  className={cn(SELECT_CLS, "min-w-[160px] flex-1")}
                  value={it.projectId}
                  onChange={(e) => setItem(idx, { projectId: e.target.value })}
                >
                  <option value="">프로젝트 선택</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.tag})
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="시간"
                  className="w-20"
                  value={it.hours}
                  onChange={(e) => setItem(idx, { hours: e.target.value })}
                />
                <select
                  className={cn(SELECT_CLS, "w-28")}
                  value={it.status}
                  onChange={(e) => setItem(idx, { status: e.target.value })}
                >
                  {DAILY_STATUS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
            <Plus className="size-4" />
            업무 추가
          </Button>
          {noProjects && (
            <p className="text-xs text-amber-600">
              등록된 프로젝트가 없습니다. 관리자가 프로젝트 태그를 먼저 등록해야 합니다.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* 주/월: 템플릿 항목 */}
          <div className="space-y-4 rounded-lg border bg-card p-4">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                이 보고 유형의 템플릿이 없습니다. 관리자에게 문의하세요.
              </p>
            )}
            {fields.map((f) => (
              <div key={f.key} className="grid gap-2">
                <Label>
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    rows={3}
                    value={(content[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                ) : f.type === "number" ? (
                  <Input
                    type="number"
                    value={(content[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                ) : f.type === "select" ? (
                  <select
                    className={SELECT_CLS}
                    value={(content[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  >
                    <option value="">선택</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "multiselect" ? (
                  <div className="flex flex-wrap gap-3">
                    {(f.options ?? []).map((o) => {
                      const arr = Array.isArray(content[f.key]) ? (content[f.key] as string[]) : []
                      return (
                        <label key={o} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={arr.includes(o)}
                            onChange={() => toggleMulti(f.key, o)}
                          />
                          {o}
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <Input
                    value={(content[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 주/월: 연관 프로젝트 */}
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <Label>
              연관 프로젝트 <span className="text-destructive">*</span>
            </Label>
            {rows.map((r, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  className={SELECT_CLS}
                  value={r.projectId}
                  onChange={(e) =>
                    setRows(rows.map((x, i) => (i === idx ? { ...x, projectId: e.target.value } : x)))
                  }
                >
                  <option value="">프로젝트 선택</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.tag})
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="시간"
                  className="w-24"
                  value={r.hours}
                  onChange={(e) =>
                    setRows(rows.map((x, i) => (i === idx ? { ...x, hours: e.target.value } : x)))
                  }
                />
                {rows.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRows([...rows, { projectId: "", hours: "" }])}
            >
              <Plus className="size-4" />
              프로젝트 추가
            </Button>
            {noProjects && (
              <p className="text-xs text-amber-600">
                등록된 프로젝트가 없습니다. 관리자가 프로젝트 태그를 먼저 등록해야 합니다.
              </p>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/reports")}>
          취소
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "제출 중…" : "제출"}
        </Button>
      </div>
    </div>
  )
}
