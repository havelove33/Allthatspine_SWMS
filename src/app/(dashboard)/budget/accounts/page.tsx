import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { balancesByAccount } from "@/lib/budget"
import type { BudgetAccount, BudgetTransaction } from "@/types"
import { AccountsManager } from "./accounts-client"

export default async function BudgetAccountsPage() {
  const supabase = await createClient() // 접근 권한은 layout(requireRole)에서 보장

  const [{ data: accData }, { data: txnData }] = await Promise.all([
    supabase
      .from("budget_accounts")
      .select("*")
      .order("is_active", { ascending: false })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("budget_transactions").select("account_id, direction, amount").limit(5000),
  ])

  const accounts = (accData ?? []) as BudgetAccount[]
  const txns = (txnData ?? []) as Pick<BudgetTransaction, "account_id" | "direction" | "amount">[]

  const balances = balancesByAccount(accounts, txns)
  const txnCount = new Map<string, number>()
  for (const t of txns) {
    if (!t.account_id) continue
    txnCount.set(t.account_id, (txnCount.get(t.account_id) ?? 0) + 1)
  }

  const rows = accounts.map((a) => ({
    ...a,
    balance: balances.get(a.id) ?? 0,
    txn_count: txnCount.get(a.id) ?? 0,
  }))

  return (
    <div>
      <PageHeader
        title="자금 계정 관리"
        description="통장 · 법인카드 · 현금 등록 및 기초 잔액"
        action={
          <Link href="/budget" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            예산 현황
          </Link>
        }
      />
      <AccountsManager accounts={rows} />
    </div>
  )
}
