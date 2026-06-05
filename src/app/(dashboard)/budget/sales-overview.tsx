"use client"

import Link from "next/link"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { formatKRW } from "@/lib/budget"
import { cn } from "@/lib/utils"

type Item = { item: string; target: number; actual: number }
type Monthly = { actual: number; target: number }

function pct(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 100) : 0
}
function chartFmt(v: number | string): string {
  const n = Number(v)
  if (!n) return "0"
  return `${Math.round(n / 10000).toLocaleString("ko-KR")}만`
}

export function SalesOverview({
  year,
  totalActual,
  totalTarget,
  items,
  monthly,
  hasMonthlyTarget,
}: {
  year: number
  totalActual: number
  totalTarget: number
  items: Item[]
  monthly: Monthly[]
  hasMonthlyTarget: boolean
}) {
  const achieve = pct(totalActual, totalTarget)
  const chartData = monthly.map((m, i) => ({ name: `${i + 1}월`, 매출: m.actual, 목표: m.target }))

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <TrendingUp className="size-4 text-muted-foreground" />
          매출 현황 · {year}년
        </h2>
        <Link href="/budget/targets" className="text-xs text-muted-foreground hover:text-foreground">
          매출 목표 설정
        </Link>
      </div>

      {totalTarget <= 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">아직 매출 목표가 없습니다.</p>
          <Link
            href="/budget/targets"
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            매출 목표 설정하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 연간 총 매출 목표 달성 */}
          <div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  연간 총 매출 <span className="text-muted-foreground/80">(목표 {formatKRW(totalTarget)})</span>
                </p>
                <p className="text-2xl font-bold tabular-nums">{formatKRW(totalActual)}</p>
              </div>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  achieve >= 100 ? "text-emerald-600" : achieve >= 50 ? "text-primary" : "text-amber-600"
                )}
              >
                {achieve}%
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", achieve >= 100 ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${Math.min(100, achieve)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              잔여 목표 {formatKRW(Math.max(0, totalTarget - totalActual))}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* 월별 매출 추이 */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">월별 매출 추이</p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={48} tickFormatter={chartFmt} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => formatKRW(Number(v))} />
                  {hasMonthlyTarget && <Legend wrapperStyle={{ fontSize: 11 }} />}
                  <Bar dataKey="매출" fill="#0E7C8C" radius={[3, 3, 0, 0]} />
                  {hasMonthlyTarget && <Line dataKey="목표" stroke="#f59e0b" strokeWidth={2} dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 세부 항목별 매출 % */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">세부 항목별 매출</p>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">항목이 없습니다.</p>
              ) : (
                <ul className="space-y-2.5">
                  {items.map((it, i) => {
                    const p = pct(it.actual, it.target)
                    return (
                      <li key={i}>
                        <div className="mb-0.5 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{it.item}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatKRW(it.actual)}
                            {it.target > 0 && ` / ${formatKRW(it.target)}`}
                            {it.target > 0 && (
                              <span
                                className={cn(
                                  "ml-1 font-semibold",
                                  p >= 100 ? "text-emerald-600" : "text-foreground"
                                )}
                              >
                                {p}%
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              it.target === 0
                                ? "bg-muted-foreground/40"
                                : p >= 100
                                  ? "bg-emerald-500"
                                  : "bg-primary"
                            )}
                            style={{ width: it.target > 0 ? `${Math.min(100, p)}%` : "100%" }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
