import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getKstYearMonth } from "@/lib/attendance"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BudgetStats } from "./stats-client"

export default async function BudgetStatsPage() {
  const supabase = await createClient() // 접근 권한은 layout(requireRole)에서 보장

  const [{ data: accData }, { data: txnData }] = await Promise.all([
    supabase.from("budget_accounts").select("id, kind"),
    supabase
      .from("budget_transactions")
      .select("txn_date, direction, amount, account_id")
      .order("txn_date", { ascending: true })
      .limit(20000),
  ])

  const accs = (accData ?? []) as { id: string; kind: string }[]
  const kindMap = new Map(accs.map((a) => [a.id, a.kind]))
  const raw = (txnData ?? []) as {
    txn_date: string
    direction: string
    amount: number
    account_id: string | null
  }[]
  const rows = raw.map((t) => ({
    txn_date: t.txn_date,
    direction: (t.direction === "in" ? "in" : "out") as "in" | "out",
    amount: Number(t.amount) || 0,
    account_kind: t.account_id ? kindMap.get(t.account_id) ?? null : null,
  }))
  const currentYear = getKstYearMonth(new Date()).slice(0, 4)

  return (
    <div>
      <PageHeader
        title="예산 통계"
        description="월별 · 연도별 입금 · 출금 · 카드 사용 추이"
        action={
          <Link href="/budget" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            일별 현황
          </Link>
        }
      />
      <BudgetStats rows={rows} currentYear={currentYear} />
    </div>
  )
}
