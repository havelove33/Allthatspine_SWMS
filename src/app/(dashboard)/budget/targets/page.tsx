import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getKstYearMonth } from "@/lib/attendance"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TargetsManager } from "./targets-client"
import type { BudgetSalesTarget } from "@/types"

export default async function BudgetTargetsPage() {
  const supabase = await createClient() // 접근 권한은 layout(requireRole)에서 보장
  const { data } = await supabase
    .from("budget_sales_targets")
    .select("*")
    .order("year", { ascending: false })
    .order("sort", { ascending: true })
    .order("item", { ascending: true })

  const targets = (data ?? []) as BudgetSalesTarget[]
  const years = Array.from(new Set(targets.map((t) => t.year)))
  const currentYear = Number(getKstYearMonth(new Date()).slice(0, 4))

  return (
    <div>
      <PageHeader
        title="매출 목표"
        description="연도별 매출 항목과 연간·월간 목표 설정 (월간은 선택)"
        action={
          <Link href="/budget" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            예산 현황
          </Link>
        }
      />
      <TargetsManager targets={targets} years={years} currentYear={currentYear} />
    </div>
  )
}
