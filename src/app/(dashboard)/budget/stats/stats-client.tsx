"use client"

import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatKRW, txnBucket } from "@/lib/budget"

type Slim = {
  txn_date: string
  direction: "in" | "out"
  amount: number
  account_kind: string | null
}
type Agg = { in: number; out: number; card: number; count: number }

function emptyAgg(): Agg {
  return { in: 0, out: 0, card: 0, count: 0 }
}
function add(a: Agg, r: Slim) {
  const amt = Number(r.amount)
  const b = txnBucket(r.direction, r.account_kind)
  if (b === "in") a.in += amt
  else if (b === "out") a.out += amt
  else a.card += r.direction === "out" ? amt : -amt
  a.count += 1
}

/** 차트 Y축: 원 → 만원 단위 축약 */
function chartFmt(v: number | string): string {
  const n = Number(v)
  if (!n) return "0"
  return `${Math.round(n / 10000).toLocaleString("ko-KR")}만`
}

type BarRow = { name: string; 입금: number; 출금: number; 카드: number }

function MoneyBars({ data }: { data: BarRow[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} width={56} tickFormatter={chartFmt} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            formatter={(v) => formatKRW(Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="입금" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="출금" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="카드" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BudgetStats({ rows, currentYear }: { rows: Slim[]; currentYear: string }) {
  const years = useMemo(() => {
    const set = new Set<string>(rows.map((r) => r.txn_date.slice(0, 4)))
    set.add(currentYear)
    return Array.from(set).sort().reverse()
  }, [rows, currentYear])

  const [year, setYear] = useState(currentYear)

  // 선택 연도 월별
  const monthly = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => emptyAgg())
    for (const r of rows) {
      if (r.txn_date.slice(0, 4) !== year) continue
      const mi = Number(r.txn_date.slice(5, 7)) - 1
      if (mi >= 0 && mi < 12) add(arr[mi], r)
    }
    return arr
  }, [rows, year])

  const monthlyTotal = useMemo(() => {
    const t = emptyAgg()
    for (const m of monthly) {
      t.in += m.in
      t.out += m.out
      t.card += m.card
      t.count += m.count
    }
    return t
  }, [monthly])

  // 연도별
  const yearly = useMemo(() => {
    const map = new Map<string, Agg>()
    for (const r of rows) {
      const y = r.txn_date.slice(0, 4)
      const a = map.get(y) ?? emptyAgg()
      add(a, r)
      map.set(y, a)
    }
    return Array.from(map.entries())
      .map(([y, a]) => ({ year: y, ...a }))
      .sort((x, z) => z.year.localeCompare(x.year))
  }, [rows])

  const monthlyChart: BarRow[] = monthly.map((m, i) => ({
    name: `${i + 1}월`,
    입금: m.in,
    출금: m.out,
    카드: m.card,
  }))
  const yearlyChart: BarRow[] = [...yearly]
    .reverse()
    .map((y) => ({ name: `${y.year}`, 입금: y.in, 출금: y.out, 카드: y.card }))

  return (
    <div className="space-y-10">
      {/* 월별 통계 */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">월별 통계</h2>
          <div className="ml-auto flex flex-wrap gap-1">
            {years.map((y) => (
              <Button
                key={y}
                size="sm"
                variant={y === year ? "default" : "outline"}
                onClick={() => setYear(y)}
              >
                {y}년
              </Button>
            ))}
          </div>
        </div>

        <MoneyBars data={monthlyChart} />

        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>월</TableHead>
                <TableHead className="text-right">입금</TableHead>
                <TableHead className="text-right">출금</TableHead>
                <TableHead className="text-right">카드 사용</TableHead>
                <TableHead className="text-right">순증감</TableHead>
                <TableHead className="text-center">건수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthly.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{i + 1}월</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {m.in ? formatKRW(m.in) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">
                    {m.out ? formatKRW(m.out) : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">
                    {m.card ? formatKRW(m.card) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatKRW(m.in - m.out)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {m.count || "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>{year}년 합계</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">
                  {formatKRW(monthlyTotal.in)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-red-600">
                  {formatKRW(monthlyTotal.out)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-amber-600">
                  {formatKRW(monthlyTotal.card)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKRW(monthlyTotal.in - monthlyTotal.out)}
                </TableCell>
                <TableCell className="text-center tabular-nums text-muted-foreground">
                  {monthlyTotal.count}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 연도별 통계 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">연도별 통계</h2>
        {yearly.length > 0 && <MoneyBars data={yearlyChart} />}
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>연도</TableHead>
                <TableHead className="text-right">입금</TableHead>
                <TableHead className="text-right">출금</TableHead>
                <TableHead className="text-right">카드 사용</TableHead>
                <TableHead className="text-right">순증감</TableHead>
                <TableHead className="text-center">건수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearly.map((y) => (
                <TableRow
                  key={y.year}
                  onClick={() => setYear(y.year)}
                  className={cn("cursor-pointer", y.year === year && "bg-accent/60")}
                >
                  <TableCell className="font-medium">{y.year}년</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">{formatKRW(y.in)}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">{formatKRW(y.out)}</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">{formatKRW(y.card)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatKRW(y.in - y.out)}</TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">{y.count}</TableCell>
                </TableRow>
              ))}
              {yearly.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
