import { getCurrentEmployee } from "@/lib/auth"
import { getKstDateString } from "@/lib/attendance"
import { PageHeader } from "@/components/dashboard/page-header"
import { ApprovalForm } from "../approval-form"

export default async function NewApprovalPage() {
  await getCurrentEmployee()
  return (
    <div>
      <PageHeader title="새 상신" description="휴가 · 지출 · 구매 · 일반 기안" />
      <ApprovalForm today={getKstDateString(new Date())} />
    </div>
  )
}
