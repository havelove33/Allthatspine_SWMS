"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { addSalesTarget, updateSalesTarget, deleteSalesTarget } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { formatKRW } from "@/lib/budget"
import type { BudgetSalesTarget } from "@/types"

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function monthlySum(t: BudgetSalesTarget): number {
  return MONTHS.reduce((s, m) => s + (Number(t.monthly_targets?.[String(m)]) || 0), 0)
}

export function TargetsManager({
  targets,
  years,
  currentYear,
}: {
  targets: BudgetSalesTarget[]
  years: number[]
  currentYear: number
}) {
  const router = useRouter()
  const [year, setYear] = useState(currentYear)

  const [name, setName] = useState("")
  const [annual, setAnnual] = useState("")
  const [adding, setAdding] = useState(false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetSalesTarget | null>(null)
  const [eName, setEName] = useState("")
  const [eAnnual, setEAnnual] = useState("")
  const [eMonthly, setEMonthly] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const allYears = Array.from(new Set([currentYear, currentYear + 1, ...years, year])).sort((a, b) => b - a)
  const yearTargets = targets
    .filter((t) => t.year === year)
    .sort((a, b) => a.sort - b.sort || a.item.localeCompare(b.item))
  const totalAnnual = yearTargets.reduce((s, t) => s + (Number(t.annual_target) || 0), 0)

  async function onAdd() {
    if (!name.trim()) {
      toast.error("항목명을 입력하세요.")
      return
    }
    setAdding(true)
    const res = await addSalesTarget({ year, item: name, annual_target: Number(annual) || 0 })
    setAdding(false)
    if (res?.ok) {
      toast.success("항목을 추가했습니다.")
      setName("")
      setAnnual("")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  function openEdit(t: BudgetSalesTarget) {
    setEditing(t)
    setEName(t.item)
    setEAnnual(String(t.annual_target || ""))
    const mt: Record<string, string> = {}
    for (const m of MONTHS) {
      const v = t.monthly_targets?.[String(m)]
      mt[String(m)] = v ? String(v) : ""
    }
    setEMonthly(mt)
    setOpen(true)
  }

  async function onSaveEdit() {
    if (!editing) return
    const monthly: Record<string, number> = {}
    for (const m of MONTHS) {
      const v = Number(eMonthly[String(m)])
      if (v > 0) monthly[String(m)] = v
    }
    setSaving(true)
    const res = await updateSalesTarget(editing.id, {
      item: eName,
      annual_target: Number(eAnnual) || 0,
      monthly_targets: monthly,
    })
    setSaving(false)
    if (res?.ok) {
      toast.success("저장했습니다.")
      setOpen(false)
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  async function onDelete(t: BudgetSalesTarget) {
    if (!confirm(`'${t.item}' 매출 목표를 삭제할까요?`)) return
    const res = await deleteSalesTarget(t.id)
    if (res?.ok) {
      toast.success("삭제했습니다.")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  function fillEvenly() {
    const a = Number(eAnnual) || 0
    if (a <= 0) return
    const per = Math.round(a / 12)
    const mt: Record<string, string> = {}
    for (const m of MONTHS) mt[String(m)] = String(per)
    setEMonthly(mt)
  }

  return (
    <div className="space-y-6">
      {/* 연도 선택 */}
      <div className="flex flex-wrap gap-1">
        {allYears.map((y) => (
          <Button key={y} size="sm" variant={y === year ? "default" : "outline"} onClick={() => setYear(y)}>
            {y}년
          </Button>
        ))}
      </div>

      {/* 항목 추가 */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">{year}년 매출 항목 추가</h2>
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="t-name">항목명</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 제품매출, 서비스매출" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-annual">연간 목표 (원)</Label>
            <MoneyInput
              id="t-annual"
              value={annual}
              onValueChange={setAnnual}
              placeholder="0"
            />
          </div>
          <Button onClick={onAdd} disabled={adding}>
            <Plus className="size-4" />
            {adding ? "추가 중…" : "추가"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          월별 목표는 선택사항입니다. 추가 후 ‘수정’에서 월별로 입력할 수 있습니다.
        </p>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>항목</TableHead>
              <TableHead className="text-right">연간 목표</TableHead>
              <TableHead className="text-right">월별 목표 합</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearTargets.map((t) => {
              const ms = monthlySum(t)
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.item}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKRW(t.annual_target)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {ms > 0 ? formatKRW(ms) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)} title="수정">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onDelete(t)} title="삭제">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {yearTargets.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {year}년 매출 항목이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {yearTargets.length > 0 && (
              <TableRow className="border-t-2 font-semibold">
                <TableCell>연간 총 매출 목표</TableCell>
                <TableCell className="text-right tabular-nums">{formatKRW(totalAnnual)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 수정 다이얼로그 (월별 목표 포함) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>매출 항목 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="e-name">항목명</Label>
                <Input id="e-name" value={eName} onChange={(e) => setEName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-annual">연간 목표 (원)</Label>
                <MoneyInput id="e-annual" value={eAnnual} onValueChange={setEAnnual} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>월별 목표 (선택)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={fillEvenly}>
                연간 ÷ 12 균등 채우기
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MONTHS.map((m) => (
                <div key={m} className="grid gap-1">
                  <span className="text-[11px] text-muted-foreground">{m}월</span>
                  <MoneyInput
                    className="h-8 text-sm"
                    value={eMonthly[String(m)] ?? ""}
                    onValueChange={(v) => setEMonthly((p) => ({ ...p, [String(m)]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="-mx-4 -mb-4 mt-1 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={onSaveEdit} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
