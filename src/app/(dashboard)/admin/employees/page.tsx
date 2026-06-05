import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { CreateEmployeeButton, EmployeeTable } from "./employees-client"
import type { Employee } from "@/types"

export default async function EmployeesPage() {
  await requireRole(["admin"])

  const supabase = await createClient()
  const { data } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: true })

  const employees = (data ?? []) as Employee[]

  return (
    <div>
      <PageHeader
        title="직원 관리"
        description="직원 계정 생성·권한·연차·재직상태를 관리합니다."
        action={<CreateEmployeeButton />}
      />
      <EmployeeTable employees={employees} />
    </div>
  )
}
