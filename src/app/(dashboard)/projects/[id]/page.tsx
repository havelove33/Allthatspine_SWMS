import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getKstDateString } from "@/lib/attendance"
import { TaskList, type TaskItem } from "./task-list"
import { MilestoneList, type MilestoneItem } from "./milestone-list"
import { ProjectMetaEditor } from "./project-meta-editor"

const LIGHT: Record<string, { color: string; label: string }> = {
  green: { color: "bg-emerald-500", label: "정상" },
  yellow: { color: "bg-amber-500", label: "지연" },
  red: { color: "bg-red-500", label: "위험" },
}
const MISSION_STATUS: Record<string, "default" | "secondary" | "outline"> = {
  작성: "secondary",
  진행: "default",
  완료: "outline",
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const { id } = await params
  const supabase = await createClient()
  const today = getKstDateString(new Date())

  const { data: p } = await supabase
    .from("projects")
    .select("*, parent:projects!parent_project_id(id, name)")
    .eq("id", id)
    .single()
  if (!p) notFound()

  // 자동 수집 + 구성요소
  const [
    { data: subs },
    { data: tasksData },
    { data: msData },
    { data: missions },
    { data: links },
    { data: emps },
    { data: allProjects },
    { data: posts },
  ] = await Promise.all([
    supabase.from("projects").select("id, name, status_light, progress").eq("parent_project_id", id),
    supabase
      .from("project_tasks")
      .select("id, title, done, due_date, assignee:employees!assignee_id(name), post:project_posts!post_id(id, title)")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_milestones")
      .select("id, title, date, done")
      .eq("project_id", id)
      .order("date", { ascending: true }),
    supabase
      .from("missions")
      .select("id, title, status, progress, employee:employees!employee_id(name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("report_project_links")
      .select("hours, report:reports(id, report_type, report_date, period_start, submitted_at, employee:employees!employee_id(name))")
      .eq("project_id", id),
    supabase.from("employees").select("id, name").eq("status", "재직").neq("role", "kiosk").order("name"),
    supabase.from("projects").select("id, name").neq("status", "보관"),
    supabase
      .from("project_posts")
      .select("id, title, created_at, author:employees!author_id(name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ])

  const tasks: TaskItem[] = (tasksData ?? []).map((t) => {
    const row = t as unknown as {
      id: string
      title: string
      done: boolean
      due_date: string | null
      assignee: { name: string } | null
      post: { id: string; title: string } | null
    }
    return {
      id: row.id,
      title: row.title,
      done: row.done,
      due_date: row.due_date,
      assigneeName: row.assignee?.name ?? null,
      postId: row.post?.id ?? null,
      postTitle: row.post?.title ?? null,
    }
  })
  const milestones: MilestoneItem[] = (msData ?? []) as MilestoneItem[]
  const totalHours = (links ?? []).reduce((s, l) => s + (Number(l.hours) || 0), 0)

  const activeMissions = ((missions ?? []) as unknown as {
    id: string
    title: string
    status: string
    progress: number
    employee: { name: string } | null
  }[]).filter((m) => m.status !== "완료")

  const relatedReports = ((links ?? []) as unknown as {
    report: { id: string; report_type: string; report_date: string | null; period_start: string | null; submitted_at: string | null; employee: { name: string } | null } | null
  }[])
    .map((l) => l.report)
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => (a.submitted_at ?? "") < (b.submitted_at ?? "") ? 1 : -1)
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
    .slice(0, 8)

  const light = LIGHT[p.status_light] ?? LIGHT.green

  return (
    <div className="max-w-5xl">
      <Link href="/projects" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> 목록으로
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={cn("size-3 rounded-full", light.color)} title={light.label} />
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {p.tag && <Badge variant="outline">#{p.tag}</Badge>}
        <Badge variant="secondary">{p.status}</Badge>
        {p.parent && (
          <Link href={`/projects/${p.parent.id}`} className="text-sm text-muted-foreground hover:underline">
            ↑ {p.parent.name}
          </Link>
        )}
        {admin && (
          <div className="ml-auto">
            <ProjectMetaEditor
              project={{
                id: p.id,
                overview: p.overview,
                status: p.status,
                status_light: p.status_light,
                progress: p.progress,
                start_date: p.start_date,
                end_date: p.end_date,
                parent_project_id: p.parent_project_id,
              }}
              parents={(allProjects ?? []) as { id: string; name: string }[]}
            />
          </div>
        )}
      </div>

      {/* 현황 */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="진행률" value={`${p.progress}%`} />
        <Stat label="투입 공수" value={`${totalHours}h`} />
        <Stat label="진행 중 업무" value={`${activeMissions.length}건`} />
        <Stat label="기간" value={p.start_date ? `${p.start_date.slice(5)}~${p.end_date ? p.end_date.slice(5) : ""}` : "-"} />
      </div>

      {/* 개요 */}
      <div className="mb-5 rounded-lg border bg-card p-5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">개요</p>
        {p.overview ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.overview}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            개요가 없습니다.{admin && " ‘프로젝트 수정’에서 작성하세요."}
          </p>
        )}
      </div>

      {/* 게시판 (블로그) */}
      <div className="mb-5 rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold">게시판</span>
          <Link href={`/projects/${id}/posts/new`} className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-4" />
            글쓰기
          </Link>
        </div>
        <div className="divide-y">
          {((posts ?? []) as unknown as { id: string; title: string; created_at: string; author: { name: string } | null }[]).map((po) => (
            <Link
              key={po.id}
              href={`/projects/${id}/posts/${po.id}`}
              className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/40"
            >
              <span className="truncate font-medium">{po.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {po.author?.name} · {po.created_at?.slice(0, 10)}
              </span>
            </Link>
          ))}
          {(posts ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              게시글이 없습니다. ‘글쓰기’로 프로젝트 설명·지시사항을 작성하세요.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <TaskList
            projectId={id}
            tasks={tasks}
            isAdmin={admin}
            employees={(emps ?? []) as { id: string; name: string }[]}
            posts={((posts ?? []) as unknown as { id: string; title: string }[]).map((po) => ({ id: po.id, title: po.title }))}
          />
          <MilestoneList projectId={id} milestones={milestones} isAdmin={admin} today={today} />
        </div>

        <div className="space-y-5">
          {/* 진행 중 나의 업무 (자동 수집) */}
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3 font-semibold">진행 중 업무</div>
            <div className="divide-y">
              {activeMissions.map((m) => (
                <Link key={m.id} href={`/missions/${m.id}`} className="block px-4 py-2.5 hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{m.title}</span>
                    <Badge variant={MISSION_STATUS[m.status] ?? "secondary"} className="shrink-0 text-[10px]">
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.employee?.name} · {m.progress}%
                  </p>
                </Link>
              ))}
              {activeMissions.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">진행 중인 업무가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 관련 보고 (자동 수집) */}
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3 font-semibold">관련 업무보고</div>
            <div className="divide-y">
              {relatedReports.map((r) => (
                <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40">
                  <span className="truncate">
                    {r.employee?.name} · {r.report_type === "daily" ? r.report_date : r.period_start}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {r.report_type === "daily" ? "일일" : r.report_type === "weekly" ? "주간" : "월간"}
                  </Badge>
                </Link>
              ))}
              {relatedReports.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">관련 보고가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 하위 프로젝트 */}
          {(subs ?? []).length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3 font-semibold">하위 프로젝트</div>
              <div className="divide-y">
                {(subs ?? []).map((s) => {
                  const sl = LIGHT[(s.status_light as string) ?? "green"] ?? LIGHT.green
                  return (
                    <Link key={s.id as string} href={`/projects/${s.id}`} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/40">
                      <span className={cn("size-2 rounded-full", sl.color)} />
                      <span className="flex-1 truncate">{s.name as string}</span>
                      <span className="text-xs text-muted-foreground">{s.progress as number}%</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
