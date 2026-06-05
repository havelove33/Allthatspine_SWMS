import Link from "next/link"
import { Users, FileText, Stamp, FolderKanban, CalendarDays, Megaphone, Inbox } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getKstDateString } from "@/lib/attendance"
import { StatCard, WidgetCard, EmptyRow, PendingChip } from "@/components/dashboard/widgets"
import { BudgetMiniWidget } from "./budget-widget"
import { ProjectSignals } from "./project-signals"
import { AutoBackupSwitch } from "@/components/dashboard/login-auto-backup"
import { cn } from "@/lib/utils"

/** 'YYYY-MM-DD'에 n일을 더한 날짜(로컬, 순수). */
function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number)
  const dt = new Date(y, m - 1, day)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export async function AdminBoard() {
  const supabase = await createClient()
  const today = getKstDateString(new Date())
  const in7 = addDays(today, 7)

  const [empsR, attR, leavesTodayR, reportsTodayR, projectsR, noticesR, milestonesR] =
    await Promise.all([
      supabase.from("employees").select("id, name").neq("status", "퇴사").order("name"),
      supabase.from("attendance").select("employee_id, check_in_at, is_late").eq("work_date", today),
      supabase
        .from("leaves")
        .select("employee_id, leave_type, employee:employees!employee_id(name)")
        .eq("status", "승인")
        .lte("start_date", today)
        .gte("end_date", today),
      supabase.from("reports").select("employee_id").eq("report_type", "daily").eq("report_date", today),
      supabase.from("projects").select("id, name, status_light, progress").neq("status", "보관"),
      supabase
        .from("board_posts")
        .select("id, title, category, created_at")
        .neq("category", "건의")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("project_milestones")
        .select("title, date, project:projects(name)")
        .eq("done", false)
        .gte("date", today)
        .lte("date", in7)
        .order("date", { ascending: true }),
    ])

  const [apC, lvC, corrC, misC] = await Promise.all([
    supabase.from("approvals").select("*", { count: "exact", head: true }).eq("status", "대기"),
    supabase.from("leaves").select("*", { count: "exact", head: true }).eq("status", "대기"),
    supabase.from("attendance_corrections").select("*", { count: "exact", head: true }).eq("status", "대기"),
    supabase.from("missions").select("*", { count: "exact", head: true }).eq("status", "작성"),
  ])

  const employees = (empsR.data ?? []) as { id: string; name: string }[]
  const total = employees.length
  const att = (attR.data ?? []) as { employee_id: string; check_in_at: string | null; is_late: boolean }[]
  const checkedInIds = new Set(att.filter((r) => r.check_in_at).map((r) => r.employee_id))
  const lateCount = att.filter((r) => r.is_late).length
  const onLeave = (leavesTodayR.data ?? []) as unknown as {
    employee_id: string
    leave_type: string
    employee: { name: string } | null
  }[]
  const onLeaveIds = new Set(onLeave.map((l) => l.employee_id))
  const submittedIds = new Set(((reportsTodayR.data ?? []) as { employee_id: string }[]).map((r) => r.employee_id))

  const notCheckedIn = employees.filter((e) => !checkedInIds.has(e.id) && !onLeaveIds.has(e.id))
  const notReported = employees.filter((e) => !submittedIds.has(e.id) && !onLeaveIds.has(e.id))
  const checkedInCount = checkedInIds.size
  const reportedCount = employees.filter((e) => submittedIds.has(e.id)).length

  const projects = (projectsR.data ?? []) as {
    id: string
    name: string
    status_light: string
    progress: number
  }[]
  const green = projects.filter((p) => p.status_light === "green").length
  const yellow = projects.filter((p) => p.status_light === "yellow").length
  const red = projects.filter((p) => p.status_light === "red").length

  // 세부 업무(project_tasks) — 신호등 펼침용
  const projIds = projects.map((p) => p.id)
  let taskData: { id: string; project_id: string; title: string; done: boolean }[] = []
  if (projIds.length) {
    const { data } = await supabase
      .from("project_tasks")
      .select("id, project_id, title, done")
      .in("project_id", projIds)
      .order("done", { ascending: true })
      .order("created_at", { ascending: true })
    taskData = (data ?? []) as { id: string; project_id: string; title: string; done: boolean }[]
  }
  const tasksByProj = new Map<string, { id: string; title: string; done: boolean }[]>()
  for (const t of taskData) {
    const arr = tasksByProj.get(t.project_id) ?? []
    arr.push({ id: t.id, title: t.title, done: t.done })
    tasksByProj.set(t.project_id, arr)
  }
  const lightOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 }
  const projWithTasks = [...projects]
    .sort((a, b) => (lightOrder[a.status_light] ?? 3) - (lightOrder[b.status_light] ?? 3))
    .map((p) => ({ ...p, tasks: tasksByProj.get(p.id) ?? [] }))

  const apPending = apC.count ?? 0
  const lvPending = lvC.count ?? 0
  const corrPending = corrC.count ?? 0
  const misPending = misC.count ?? 0
  const pendingTotal = apPending + lvPending + corrPending + misPending

  const notices = (noticesR.data ?? []) as { id: string; title: string; category: string; created_at: string }[]
  const milestones = (milestonesR.data ?? []) as unknown as {
    title: string
    date: string
    project: { name: string } | null
  }[]

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="오늘 출근"
          value={`${checkedInCount}/${total}`}
          sub={`미출근 ${notCheckedIn.length} · 지각 ${lateCount} · 휴가 ${onLeave.length}`}
          tone={notCheckedIn.length > 0 ? "text-red-600" : "text-emerald-600"}
          href="/attendance"
        />
        <StatCard
          icon={FileText}
          label="오늘 일일보고"
          value={`${reportedCount}/${total}`}
          sub={`미제출 ${notReported.length}명`}
          tone={notReported.length > 0 ? "text-amber-600" : "text-emerald-600"}
          href="/reports"
        />
        <StatCard
          icon={Stamp}
          label="결재 대기"
          value={`${apPending}건`}
          sub="전자결재 승인 대기"
          tone={apPending > 0 ? "text-amber-600" : undefined}
          href="/approvals"
        />
        <StatCard
          icon={FolderKanban}
          label="주의 프로젝트"
          value={`${red + yellow}`}
          sub={`위험 ${red} · 지연 ${yellow} · 정상 ${green}`}
          tone={red > 0 ? "text-red-600" : yellow > 0 ? "text-amber-600" : "text-emerald-600"}
          href="/projects"
        />
      </div>

      {/* 처리 대기함 */}
      <WidgetCard title={`처리 대기함${pendingTotal > 0 ? ` · ${pendingTotal}건` : ""}`} icon={Inbox}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <PendingChip label="휴가 승인" count={lvPending} href="/attendance" />
          <PendingChip label="근태 정정" count={corrPending} href="/attendance" />
          <PendingChip label="전자결재" count={apPending} href="/approvals" />
          <PendingChip label="나의 업무 승인" count={misPending} href="/missions" />
        </div>
      </WidgetCard>

      {/* 로그인 시 자동 백업 스위치 (이 PC · 기본 OFF) */}
      <AutoBackupSwitch />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 오늘 근무 현황 */}
        <WidgetCard title="오늘 근무 현황" icon={Users} href="/attendance">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-xl font-bold tabular-nums text-emerald-600">{checkedInCount}</p>
              <p className="text-xs text-muted-foreground">출근</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-xl font-bold tabular-nums text-red-600">{notCheckedIn.length}</p>
              <p className="text-xs text-muted-foreground">미출근</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="text-xl font-bold tabular-nums text-amber-600">{onLeave.length}</p>
              <p className="text-xs text-muted-foreground">휴가</p>
            </div>
          </div>
          {notCheckedIn.length > 0 && (
            <p className="text-xs">
              <span className="text-muted-foreground">미출근: </span>
              {notCheckedIn.map((e) => e.name).join(", ")}
            </p>
          )}
          {onLeave.length > 0 && (
            <p className="mt-1 text-xs">
              <span className="text-muted-foreground">휴가: </span>
              {onLeave.map((l) => `${l.employee?.name ?? "직원"}(${l.leave_type})`).join(", ")}
            </p>
          )}
          {notCheckedIn.length === 0 && onLeave.length === 0 && <EmptyRow>전원 출근 완료 👍</EmptyRow>}
        </WidgetCard>

        {/* 프로젝트 신호등 + 세부 업무 펼침 */}
        <WidgetCard title="프로젝트 현황" icon={FolderKanban} href="/projects">
          <div className="mb-3 flex gap-2 text-xs">
            <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">정상 {green}</span>
            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">지연 {yellow}</span>
            <span className="rounded bg-red-100 px-2 py-1 text-red-700">위험 {red}</span>
          </div>
          <ProjectSignals projects={projWithTasks} />
        </WidgetCard>

        {/* 오늘 보고 미제출자 */}
        <WidgetCard title="오늘 보고 미제출" icon={FileText} href="/reports">
          {notReported.length === 0 ? (
            <EmptyRow>전원 제출 완료 👍</EmptyRow>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {notReported.map((e) => (
                <span key={e.id} className="rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-700">
                  {e.name}
                </span>
              ))}
            </div>
          )}
        </WidgetCard>

        {/* 다가오는 마일스톤 */}
        <WidgetCard title="다가오는 일정 (7일)" icon={CalendarDays} href="/calendar">
          {milestones.length === 0 ? (
            <EmptyRow>예정된 마일스톤이 없습니다.</EmptyRow>
          ) : (
            <ul className="space-y-1.5">
              {milestones.slice(0, 6).map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                    {m.date.slice(5).replace("-", ".")}
                  </span>
                  <span className="truncate">
                    {m.project?.name ? <span className="text-muted-foreground">{m.project.name} · </span> : null}
                    {m.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        {/* 예산 */}
        <BudgetMiniWidget />

        {/* 최근 공지 */}
        <WidgetCard title="최근 공지·게시글" icon={Megaphone} href="/board">
          {notices.length === 0 ? (
            <EmptyRow>게시글이 없습니다.</EmptyRow>
          ) : (
            <ul className="divide-y">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link href={`/board/${n.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-primary">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                        n.category === "공지" ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                      )}
                    >
                      {n.category}
                    </span>
                    <span className="flex-1 truncate">{n.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {n.created_at.slice(5, 10).replace("-", ".")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </div>
    </div>
  )
}
