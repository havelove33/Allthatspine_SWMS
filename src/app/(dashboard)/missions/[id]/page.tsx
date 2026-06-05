import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { MissionControls } from "./mission-detail"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  작성: "secondary",
  진행: "default",
  완료: "outline",
}
const PERIOD_LABEL: Record<string, string> = {
  daily: "일일",
  weekly: "주간",
  monthly: "월간",
  ongoing: "기한없음",
}

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await getCurrentEmployee()
  const { id } = await params
  const supabase = await createClient()

  const { data: m } = await supabase
    .from("missions")
    .select("*, employee:employees!employee_id(name), project:projects(name, tag)")
    .eq("id", id)
    .single()
  if (!m) notFound()

  const owner = m.employee_id === me.id
  const admin = isAdmin(me)

  return (
    <div className="max-w-2xl">
      <Link
        href="/missions"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> 목록으로
      </Link>

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {PERIOD_LABEL[m.period_type] ?? m.period_type}
          </Badge>
          <Badge variant={STATUS_VARIANT[m.status] ?? "secondary"}>{m.status}</Badge>
          <Badge variant="outline">우선순위 {m.priority}</Badge>
          {m.project && (
            <Badge variant="outline">#{m.project.tag ?? m.project.name}</Badge>
          )}
          <span className="ml-auto text-sm text-muted-foreground">{m.employee?.name}</span>
        </div>
        <h1 className="text-xl font-bold">{m.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {m.period_type === "daily"
            ? m.period_start
            : `${m.period_start}${m.period_end ? ` ~ ${m.period_end}` : " ~ 기한 없음"}`}
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">측정 가능한 목표</p>
            <p className="text-sm">{m.target_metric ?? "-"}</p>
          </div>
          {m.achievement_criteria && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">달성 기준</p>
              <p className="text-sm whitespace-pre-wrap">{m.achievement_criteria}</p>
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">진행률</p>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${m.progress}%` }} />
              </div>
              <span className="text-sm font-medium tabular-nums">{m.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <MissionControls
          mission={{
            id: m.id,
            status: m.status,
            progress: m.progress,
            self_evaluation: m.self_evaluation,
            manager_evaluation: m.manager_evaluation,
            result: m.result,
          }}
          isOwner={owner}
          isAdmin={admin}
        />
      </div>
    </div>
  )
}
