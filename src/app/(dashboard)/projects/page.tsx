import Link from "next/link"
import { Settings } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/widgets"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const LIGHT: Record<string, { color: string; label: string }> = {
  green: { color: "bg-emerald-500", label: "정상" },
  yellow: { color: "bg-amber-500", label: "지연" },
  red: { color: "bg-red-500", label: "위험" },
}

export default async function ProjectsPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("id, name, tag, status, status_light, progress")
    .neq("status", "보관")
    .order("created_at", { ascending: false })
  const projects = (data ?? []) as {
    id: string
    name: string
    tag: string | null
    status: string
    status_light: string
    progress: number
  }[]

  return (
    <div>
      <PageHeader
        title="프로젝트"
        description="회사 프로젝트 추진 현황"
        action={
          admin ? (
            <Link href="/admin/projects" className={cn(buttonVariants({ variant: "outline" }))}>
              <Settings className="size-4" />
              프로젝트 관리
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const light = LIGHT[p.status_light] ?? LIGHT.green
          return (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <div className="h-full rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", light.color)} title={light.label} />
                  <h3 className="flex-1 truncate font-semibold">{p.name}</h3>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  {p.tag && <Badge variant="outline" className="text-[10px]">#{p.tag}</Badge>}
                  <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{p.progress}%</span>
                </div>
              </div>
            </Link>
          )
        })}
        {projects.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed bg-card">
            <EmptyState
              message="진행 중인 프로젝트가 없습니다"
              sub={admin ? "관리자 → 프로젝트 태그에서 등록하세요." : undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}
