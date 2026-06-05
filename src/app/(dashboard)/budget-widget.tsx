import { Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getKstYearMonth } from "@/lib/attendance"
import { balancesByAccount, txnBucket, formatKRW } from "@/lib/budget"
import { WidgetCard } from "@/components/dashboard/widgets"
import { cn } from "@/lib/utils"

/** 'YYYY-MM' 전월 (순수). */
function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** 전월 대비 증감률 배지. kind: sales(매출 증가=좋음) / cost(매입 감소=좋음) */
function MoM({ cur, prev, kind }: { cur: number; prev: number; kind: "sales" | "cost" }) {
  if (prev <= 0) {
    return <p className="mt-0.5 text-[11px] text-muted-foreground">전월 데이터 없음</p>
  }
  const pct = Math.round(((cur - prev) / prev) * 100)
  const up = pct > 0
  const good = kind === "sales" ? up : !up
  const color = pct === 0 ? "text-muted-foreground" : good ? "text-emerald-600" : "text-red-600"
  const arrow = pct === 0 ? "→" : up ? "▲" : "▼"
  return (
    <p className={cn("mt-0.5 text-[11px]", color)}>
      전월대비 {arrow} {Math.abs(pct)}%
    </p>
  )
}

export async function BudgetMiniWidget() {
  const supabase = await createClient()
  const month = getKstYearMonth(new Date())
  const last = prevMonth(month)

  const [{ data: accs }, { data: txns }] = await Promise.all([
    supabase.from("budget_accounts").select("id, kind, opening_balance"),
    supabase.from("budget_transactions").select("txn_date, direction, amount, account_id").limit(5000),
  ])
  const accounts = (accs ?? []) as { id: string; kind: string; opening_balance: number }[]
  const txList = (txns ?? []) as {
    txn_date: string
    direction: "in" | "out"
    amount: number
    account_id: string | null
  }[]

  const bal = balancesByAccount(accounts, txList)
  const bankTotal = accounts
    .filter((a) => a.kind === "bank")
    .reduce((s, a) => s + (bal.get(a.id) ?? 0), 0)
  const kindOf = new Map(accounts.map((a) => [a.id, a.kind]))

  let salesNow = 0
  let costNow = 0
  let salesPrev = 0
  let costPrev = 0
  for (const t of txList) {
    const ym = t.txn_date.slice(0, 7)
    const b = txnBucket(t.direction, t.account_id ? kindOf.get(t.account_id) ?? null : null)
    const amt = Number(t.amount)
    if (ym === month) {
      if (b === "in") salesNow += amt
      else if (b === "out") costNow += amt
    } else if (ym === last) {
      if (b === "in") salesPrev += amt
      else if (b === "out") costPrev += amt
    }
  }

  return (
    <WidgetCard title="매출·매입 현황" icon={Wallet} href="/budget" linkLabel="예산">
      {accounts.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          등록된 자금 계정이 없습니다. 계정을 먼저 등록하세요.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">통장 잔액 합계</p>
            <p className="text-2xl font-bold tabular-nums">{formatKRW(bankTotal)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-xs text-muted-foreground">이달 매출(입금)</p>
              <p className="text-base font-semibold tabular-nums text-emerald-600">{formatKRW(salesNow)}</p>
              <MoM cur={salesNow} prev={salesPrev} kind="sales" />
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-xs text-muted-foreground">이달 매입(출금)</p>
              <p className="text-base font-semibold tabular-nums text-red-600">{formatKRW(costNow)}</p>
              <MoM cur={costNow} prev={costPrev} kind="cost" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            이달 수지{" "}
            <span className={cn("font-semibold tabular-nums", salesNow - costNow >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatKRW(salesNow - costNow)}
            </span>
          </p>
        </div>
      )}
    </WidgetCard>
  )
}
