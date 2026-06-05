"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
} from "lucide-react"
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  type TxnInput,
} from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { formatKRW, formatSigned, ACCOUNT_KIND_LABEL, txnBucket } from "@/lib/budget"
import type { BudgetAccount, BudgetTransaction } from "@/types"

type Row = BudgetTransaction & {
  account_name: string | null
  account_kind: string | null
}
type Account = Pick<BudgetAccount, "id" | "name" | "kind">

const FIELD =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
const WD = ["일", "월", "화", "수", "목", "금", "토"]

/** 'YYYY-MM-DD' 를 로컬 기준으로 n일 이동 */
function shiftDate(d: string, n: number): string {
  const [y, m, dd] = d.split("-").map(Number)
  const dt = new Date(y, m - 1, dd)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`
}
function weekday(d: string): string {
  const [y, m, dd] = d.split("-").map(Number)
  return WD[new Date(y, m - 1, dd).getDay()]
}
function dayLabel(d: string): string {
  const [, m, dd] = d.split("-").map(Number)
  return `${m}월 ${dd}일 (${weekday(d)})`
}

export function BudgetLedger({
  accounts,
  transactions,
  today,
  salesItems,
}: {
  accounts: Account[]
  transactions: Row[]
  today: string
  salesItems: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(today)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [pending, setPending] = useState(false)

  // 폼 상태
  const [fDate, setFDate] = useState(today)
  const [fDir, setFDir] = useState("out")
  const [fAccount, setFAccount] = useState("")
  const [fAmount, setFAmount] = useState("")
  const [fSummary, setFSummary] = useState("")
  const [fParty, setFParty] = useState("")
  const [fNote, setFNote] = useState("")
  const [fCategory, setFCategory] = useState("")

  // 선택일 거래
  const dayTxns = useMemo(
    () => transactions.filter((t) => t.txn_date === selected),
    [transactions, selected]
  )
  const { dayIn, dayOut, dayCard } = useMemo(() => {
    let i = 0
    let o = 0
    let c = 0
    for (const t of dayTxns) {
      const amt = Number(t.amount)
      const b = txnBucket(t.direction, t.account_kind)
      if (b === "in") i += amt
      else if (b === "out") o += amt
      else c += t.direction === "out" ? amt : -amt
    }
    return { dayIn: i, dayOut: o, dayCard: c }
  }, [dayTxns])

  // 선택일이 속한 월의 일별 요약
  const month = selected.slice(0, 7)
  const monthSummary = useMemo(() => {
    const map = new Map<string, { date: string; in: number; out: number; card: number; count: number }>()
    for (const t of transactions) {
      if (t.txn_date.slice(0, 7) !== month) continue
      const e = map.get(t.txn_date) ?? { date: t.txn_date, in: 0, out: 0, card: 0, count: 0 }
      const amt = Number(t.amount)
      const b = txnBucket(t.direction, t.account_kind)
      if (b === "in") e.in += amt
      else if (b === "out") e.out += amt
      else e.card += t.direction === "out" ? amt : -amt
      e.count += 1
      map.set(t.txn_date, e)
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, month])
  const monthTot = monthSummary.reduce(
    (s, d) => ({ in: s.in + d.in, out: s.out + d.out, card: s.card + d.card }),
    { in: 0, out: 0, card: 0 }
  )

  function openAdd() {
    setEditing(null)
    setFDate(selected) // 보고 있는 날짜로 기본 입력
    setFDir("out")
    setFAccount(accounts[0]?.id ?? "")
    setFAmount("")
    setFSummary("")
    setFParty("")
    setFNote("")
    setFCategory("")
    setOpen(true)
  }

  function openEdit(t: Row) {
    setEditing(t)
    setFDate(t.txn_date)
    setFDir(t.direction)
    setFAccount(t.account_id ?? "")
    setFAmount(String(t.amount ?? ""))
    setFSummary(t.summary ?? "")
    setFParty(t.counterparty ?? "")
    setFNote(t.note ?? "")
    setFCategory(t.category ?? "")
    setOpen(true)
  }

  async function onSave() {
    if (!fSummary.trim()) {
      toast.error("적요를 입력하세요.")
      return
    }
    const input: TxnInput = {
      txn_date: fDate,
      direction: fDir,
      amount: Number(fAmount),
      category: fDir === "in" ? fCategory : undefined,
      account_id: fAccount || undefined,
      summary: fSummary,
      counterparty: fParty,
      note: fNote,
    }
    setPending(true)
    const res = editing ? await updateTransaction(editing.id, input) : await addTransaction(input)
    setPending(false)
    if (res?.ok) {
      toast.success(editing ? "수정되었습니다." : "거래를 추가했습니다.")
      setSelected(fDate) // 입력한 날짜로 이동
      setOpen(false)
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  async function onDelete(t: Row) {
    if (!confirm("이 거래를 삭제할까요?")) return
    const res = await deleteTransaction(t.id)
    if (res?.ok) {
      toast.success("삭제되었습니다.")
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  const dayStats = [
    { label: "입금", value: dayIn, icon: ArrowDownToLine, tone: "text-emerald-600" },
    { label: "출금", value: dayOut, icon: ArrowUpFromLine, tone: "text-red-600" },
    { label: "카드 사용", value: dayCard, icon: CreditCard, tone: "text-foreground" },
  ]

  return (
    <div className="space-y-6">
      {/* 날짜 내비게이터 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => setSelected(shiftDate(selected, -1))} title="이전 날">
          <ChevronLeft className="size-4" />
        </Button>
        <Input
          type="date"
          value={selected}
          onChange={(e) => setSelected(e.target.value || today)}
          className="w-[150px]"
        />
        <Button variant="outline" size="icon-sm" onClick={() => setSelected(shiftDate(selected, 1))} title="다음 날">
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelected(today)}>
          오늘
        </Button>
        <span className="ml-1 text-sm font-semibold">{dayLabel(selected)}</span>
        {selected === today && (
          <Badge variant="secondary" className="text-[10px]">오늘</Badge>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={openAdd} disabled={accounts.length === 0}>
            <Plus className="size-4" />
            거래 추가
          </Button>
        </div>
      </div>

      {/* 선택일 합계 */}
      <div className="grid grid-cols-3 gap-3">
        {dayStats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" />
                {s.label}
              </div>
              <p className={cn("mt-1 text-lg font-bold tabular-nums sm:text-xl", s.tone)}>
                {formatKRW(s.value)}
              </p>
            </div>
          )
        })}
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        ※ <span className="font-medium text-foreground">카드 사용은 출금 합계에 포함되지 않습니다.</span>{" "}
        실제 카드대금 결제는 통장 ‘출금’으로 입력하세요.
      </p>

      {/* 선택일 거래 목록 */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>구분</TableHead>
              <TableHead>적요</TableHead>
              <TableHead>거래처</TableHead>
              <TableHead>계정</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dayTxns.map((t) => {
              const ty = txnBucket(t.direction, t.account_kind)
              const tone =
                ty === "in" ? "text-emerald-600" : ty === "card" ? "text-amber-600" : "text-red-600"
              const badgeCls =
                ty === "in"
                  ? "border-emerald-300 text-emerald-700"
                  : ty === "card"
                    ? "border-amber-300 text-amber-700"
                    : "border-red-300 text-red-700"
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", badgeCls)}>
                      {ty === "in" ? "입금" : ty === "card" ? "카드" : "출금"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate font-medium">{t.summary || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{t.counterparty || "-"}</TableCell>
                  <TableCell>
                    {t.account_name ? (
                      <span className="inline-flex items-center gap-1">
                        {t.account_name}
                        {t.account_kind && (
                          <Badge variant="secondary" className="text-[10px]">
                            {ACCOUNT_KIND_LABEL[t.account_kind as keyof typeof ACCOUNT_KIND_LABEL]}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", tone)}>
                    {formatSigned(t.direction, Number(t.amount))}
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
            {dayTxns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  이 날의 거래가 없습니다. ‘거래 추가’로 입력하세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 월 일별 요약 */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          {month.replace("-", ".")} 일별 요약
        </h3>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead className="text-right">입금</TableHead>
                <TableHead className="text-right">출금</TableHead>
                <TableHead className="text-right">카드</TableHead>
                <TableHead className="text-right">순증감</TableHead>
                <TableHead className="text-center">건수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthSummary.map((d) => (
                <TableRow
                  key={d.date}
                  onClick={() => setSelected(d.date)}
                  className={cn(
                    "cursor-pointer",
                    d.date === selected && "bg-accent/60"
                  )}
                >
                  <TableCell className="whitespace-nowrap font-medium tabular-nums">
                    {d.date.slice(5).replace("-", ".")} ({weekday(d.date)})
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {d.in ? formatKRW(d.in) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">
                    {d.out ? formatKRW(d.out) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {d.card ? formatKRW(d.card) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatKRW(d.in - d.out)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {d.count}
                  </TableCell>
                </TableRow>
              ))}
              {monthSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    이 달의 거래가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>월 합계</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {formatKRW(monthTot.in)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">
                    {formatKRW(monthTot.out)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatKRW(monthTot.card)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKRW(monthTot.in - monthTot.out)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "거래 수정" : "거래 추가"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="t-date">일자</Label>
                <Input id="t-date" type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-dir">구분</Label>
                <select id="t-dir" className={FIELD} value={fDir} onChange={(e) => setFDir(e.target.value)}>
                  <option value="in">입금</option>
                  <option value="out">출금 · 카드결제</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="t-acc">계정</Label>
                <select id="t-acc" className={FIELD} value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
                  <option value="">(미지정)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {ACCOUNT_KIND_LABEL[a.kind]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-amt">금액 (원)</Label>
                <MoneyInput
                  id="t-amt"
                  placeholder="0"
                  value={fAmount}
                  onValueChange={setFAmount}
                />
              </div>
            </div>
            {fDir === "in" && (
              <div className="grid gap-1.5">
                <Label htmlFor="t-cat">매출 항목 (선택)</Label>
                <input
                  id="t-cat"
                  list="sales-items"
                  className={FIELD}
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  placeholder="예: 제품매출, 서비스매출"
                />
                <datalist id="sales-items">
                  {salesItems.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="t-sum">
                적요 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="t-sum"
                value={fSummary}
                onChange={(e) => setFSummary(e.target.value)}
                placeholder="예: 1월 사무실 임대료, ○○ 점심식대"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-party">거래처 (선택)</Label>
              <Input
                id="t-party"
                value={fParty}
                onChange={(e) => setFParty(e.target.value)}
                placeholder="예: ○○빌딩"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-note">비고 (선택)</Label>
              <Textarea id="t-note" rows={2} value={fNote} onChange={(e) => setFNote(e.target.value)} />
            </div>
            {fAmount && Number(fAmount) > 0 && (
              <p className="text-xs text-muted-foreground">
                미리보기:{" "}
                <span className={fDir === "in" ? "text-emerald-600" : "text-red-600"}>
                  {formatSigned(fDir as "in" | "out", Number(fAmount))}
                </span>
              </p>
            )}
          </div>
          <div className="-mx-4 -mb-4 mt-1 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={onSave} disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
