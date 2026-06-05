import Link from "next/link"
import {
  Landmark,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  BarChart3,
  TrendingUp,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getKstYearMonth, getKstDateString } from "@/lib/attendance"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/widgets"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatKRW, balancesByAccount, ACCOUNT_KIND_LABEL, monthKey, txnBucket } from "@/lib/budget"
import type { BudgetAccount, BudgetTransaction, BudgetSalesTarget } from "@/types"
import { BudgetLedger } from "./budget-client"
import { SalesOverview } from "./sales-overview"

export default async function BudgetPage() {
  const supabase = await createClient() // 접근 권한은 layout(requireRole)에서 보장
  const thisMonth = getKstYearMonth(new Date())
  const year = Number(thisMonth.slice(0, 4))

  const [{ data: accData }, { data: txnData }, { data: targetData }] = await Promise.all([
    supabase
      .from("budget_accounts")
      .select("*")
      .order("is_active", { ascending: false })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_transactions")
      .select("*")
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000), // 소규모 가정 — 사실상 전체. 초과 시 페이지네이션 도입 필요.
    supabase.from("budget_sales_targets").select("*").eq("year", year),
  ])

  const accounts = (accData ?? []) as BudgetAccount[]
  const txns = (txnData ?? []) as BudgetTransaction[]
  const targets = (targetData ?? []) as BudgetSalesTarget[]

  const accMap = new Map(accounts.map((a) => [a.id, a]))
  const kindOf = (id: string | null) => (id ? accMap.get(id)?.kind ?? null : null)

  const balances = balancesByAccount(accounts, txns)
  const bankTotal = accounts
    .filter((a) => a.kind === "bank")
    .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)
  const cashTotal = accounts
    .filter((a) => a.kind === "cash")
    .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)

  // 이달 집계 — 카드 사용은 '출금'과 분리(이중 계상 방지)
  let inThisMonth = 0
  let outThisMonth = 0
  let cardThisMonth = 0
  const cardUsageMonth = new Map<string, number>() // 계정별 이달 카드 사용
  for (const t of txns) {
    if (monthKey(t.txn_date) !== thisMonth) continue
    const amt = Number(t.amount) || 0
    const bucket = txnBucket(t.direction, kindOf(t.account_id))
    if (bucket === "in") inThisMonth += amt
    else if (bucket === "out") outThisMonth += amt
    else {
      const signed = t.direction === "out" ? amt : -amt
      cardThisMonth += signed
      if (t.account_id)
        cardUsageMonth.set(t.account_id, (cardUsageMonth.get(t.account_id) ?? 0) + signed)
    }
  }

  // ── 매출(입금) 현황: 올해 기준, 항목(category)·월별 집계 ──
  const yearStr = String(year)
  const salesByItem = new Map<string, number>()
  const salesMonthly = Array.from({ length: 12 }, () => 0)
  let salesTotalActual = 0
  for (const t of txns) {
    if (t.direction !== "in") continue
    if (t.txn_date.slice(0, 4) !== yearStr) continue
    const amt = Number(t.amount) || 0
    salesTotalActual += amt
    const mi = Number(t.txn_date.slice(5, 7)) - 1
    if (mi >= 0 && mi < 12) salesMonthly[mi] += amt
    const cat = t.category?.trim() || "(미지정)"
    salesByItem.set(cat, (salesByItem.get(cat) ?? 0) + amt)
  }
  const totalTarget = targets.reduce((s, t) => s + (Number(t.annual_target) || 0), 0)
  const targetNames = new Set(targets.map((t) => t.item))
  const salesItems = targets.map((t) => ({
    item: t.item,
    target: Number(t.annual_target) || 0,
    actual: salesByItem.get(t.item) ?? 0,
  }))
  for (const [cat, actual] of salesByItem) {
    if (!targetNames.has(cat)) salesItems.push({ item: cat, target: 0, actual })
  }
  salesItems.sort((a, b) => b.target - a.target || b.actual - a.actual)
  const salesMonthlyTarget = Array.from({ length: 12 }, () => 0)
  let hasMonthlyTarget = false
  for (const t of targets) {
    const mt = t.monthly_targets || {}
    for (let m = 1; m <= 12; m++) {
      const v = Number(mt[String(m)]) || 0
      if (v > 0) {
        salesMonthlyTarget[m - 1] += v
        hasMonthlyTarget = true
      }
    }
  }
  const salesMonthly12 = salesMonthly.map((a, i) => ({ actual: a, target: salesMonthlyTarget[i] }))
  const salesItemNames = targets.map((t) => t.item)

  // 클라이언트 테이블용: 계정명/종류 부착
  const rows = txns.map((t) => ({
    ...t,
    account_name: t.account_id ? accMap.get(t.account_id)?.name ?? null : null,
    account_kind: t.account_id ? accMap.get(t.account_id)?.kind ?? null : null,
  }))

  const activeAccounts = accounts.filter((a) => a.is_active)

  const stats = [
    { label: "통장 잔액 합계", value: formatKRW(bankTotal), icon: Landmark, tone: "text-foreground" },
    { label: `이달 입금 (${thisMonth.slice(5)}월)`, value: formatKRW(inThisMonth), icon: ArrowDownToLine, tone: "text-emerald-600" },
    { label: `이달 출금 (${thisMonth.slice(5)}월)`, value: formatKRW(outThisMonth), icon: ArrowUpFromLine, tone: "text-red-600" },
    { label: "이달 카드 사용", value: formatKRW(cardThisMonth), icon: CreditCard, tone: "text-foreground" },
  ]

  return (
    <div>
      <PageHeader
        title="예산"
        description="매출 · 통장 입출금 · 잔액 · 법인카드 현황"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/budget/targets" className={cn(buttonVariants({ variant: "outline" }))}>
              <TrendingUp className="size-4" />
              매출 목표
            </Link>
            <Link href="/budget/stats" className={cn(buttonVariants({ variant: "outline" }))}>
              <BarChart3 className="size-4" />
              통계
            </Link>
            <Link href="/budget/accounts" className={cn(buttonVariants({ variant: "outline" }))}>
              <Settings className="size-4" />
              계정 관리
            </Link>
          </div>
        }
      />

      {/* 매출 현황 (섹션 최상단) */}
      <div className="mb-6">
        <SalesOverview
          year={year}
          totalActual={salesTotalActual}
          totalTarget={totalTarget}
          items={salesItems}
          monthly={salesMonthly12}
          hasMonthlyTarget={hasMonthlyTarget}
        />
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card">
          <EmptyState
            message="등록된 자금 계정이 없습니다"
            sub="먼저 통장·법인카드를 등록하고 기초 잔액을 입력하세요."
            action={
              <Link href="/budget/accounts" className={cn(buttonVariants())}>
                <Settings className="size-4" />
                계정 관리로 이동
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* 요약 현황 카드 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-4" />
                    {s.label}
                  </div>
                  <p className={cn("mt-2 text-2xl font-bold tabular-nums", s.tone)}>{s.value}</p>
                </div>
              )
            })}
          </div>

          {cashTotal !== 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              현금 잔액 합계: <span className="font-medium tabular-nums">{formatKRW(cashTotal)}</span>
            </p>
          )}

          {/* 계정 현황 — 통장/현금은 잔액, 카드는 이달 사용 */}
          <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">계정 현황</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => {
              const isCard = a.kind === "card"
              const value = isCard ? cardUsageMonth.get(a.id) ?? 0 : balances.get(a.id) ?? 0
              return (
                <div
                  key={a.id}
                  className={cn("rounded-lg border bg-card p-4", !a.is_active && "opacity-55")}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex-1 truncate font-medium">{a.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {ACCOUNT_KIND_LABEL[a.kind]}
                    </Badge>
                    {!a.is_active && (
                      <Badge variant="outline" className="text-[10px]">비활성</Badge>
                    )}
                  </div>
                  <p className={cn("text-xl font-bold tabular-nums", isCard && "text-amber-600")}>
                    {formatKRW(value)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {isCard ? "이달 사용" : `기초 ${formatKRW(a.opening_balance)}`}
                  </p>
                </div>
              )
            })}
          </div>

          {/* 일별 현황 */}
          <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">일별 현황</h2>
          <BudgetLedger
            accounts={activeAccounts}
            transactions={rows}
            today={getKstDateString(new Date())}
            salesItems={salesItemNames}
          />
        </>
      )}
    </div>
  )
}
