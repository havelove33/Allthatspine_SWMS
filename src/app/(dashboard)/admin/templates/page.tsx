import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { TemplatesEditor } from "./templates-client"
import type { TemplateField } from "@/types"

export default async function TemplatesPage() {
  await requireRole(["admin"])
  const supabase = await createClient()
  const { data } = await supabase
    .from("report_templates")
    .select("report_type, fields")

  const initial: Record<string, TemplateField[]> = {}
  for (const t of data ?? []) {
    initial[t.report_type as string] = (t.fields ?? []) as TemplateField[]
  }

  return (
    <div>
      <PageHeader
        title="보고 템플릿"
        description="일·주·월 보고의 입력 항목을 정의합니다."
      />
      <TemplatesEditor initial={initial} />
    </div>
  )
}
