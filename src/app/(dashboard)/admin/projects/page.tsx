import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { ProjectsManager } from "./projects-client"

export default async function ProjectsAdminPage() {
  await requireRole(["admin"])
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("id, name, tag, status")
    .order("created_at", { ascending: false })

  return (
    <div>
      <PageHeader
        title="프로젝트 태그"
        description="업무보고에 연결할 프로젝트(태그)를 관리합니다."
      />
      <ProjectsManager projects={data ?? []} />
    </div>
  )
}
