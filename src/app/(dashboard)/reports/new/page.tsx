import { getCurrentEmployee } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { ReportForm } from "../report-form"
import type { TemplateField } from "@/types"

export default async function NewReportPage() {
  await getCurrentEmployee()
  const supabase = await createClient()

  const { data: tplRows } = await supabase
    .from("report_templates")
    .select("report_type, fields")
  const templates: Record<string, TemplateField[]> = {}
  for (const t of tplRows ?? []) {
    templates[t.report_type as string] = (t.fields ?? []) as TemplateField[]
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, tag")
    .neq("status", "보관")
    .order("created_at", { ascending: false })

  return (
    <div>
      <PageHeader title="업무보고 작성" description="일·주·월 보고를 작성합니다." />
      <ReportForm templates={templates} projects={projects ?? []} />
    </div>
  )
}
