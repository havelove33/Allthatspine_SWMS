import Link from "next/link"
import { Plus } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApprovalsList } from "./approvals-client"

export default async function ApprovalsPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()
  const { data } = await supabase
    .from("approvals")
    .select(
      "id, form_type, title, status, created_at, applicant_id, applicant:employees!applicant_id(name)"
    )
    .order("created_at", { ascending: false })
    .limit(300)

  const rows = (
    (data ?? []) as unknown as {
      id: string
      form_type: string
      title: string
      status: string
      created_at: string
      applicant_id: string
      applicant: { name: string } | null
    }[]
  ).map((a) => ({
    id: a.id,
    form_type: a.form_type,
    title: a.title,
    status: a.status,
    created_at: a.created_at,
    applicantName: a.applicant?.name ?? "-",
    mine: a.applicant_id === me.id,
  }))

  return (
    <div>
      <PageHeader
        title="전자결재"
        description="휴가 · 지출 · 구매 · 기안 신청 및 승인"
        action={
          <Link href="/approvals/new" className={cn(buttonVariants())}>
            <Plus className="size-4" />새 상신
          </Link>
        }
      />
      <ApprovalsList rows={rows} isAdmin={admin} />
    </div>
  )
}
