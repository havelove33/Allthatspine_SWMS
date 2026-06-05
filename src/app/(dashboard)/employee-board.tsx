import Link from "next/link"
import {
  Clock,
  FileText,
  Target,
  Stamp,
  CalendarDays,
  Megaphone,
  ListTodo,
  CircleAlert,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getKstDateString, getKstYearMonth, formatKstTime } from "@/lib/attendance"
import { StatCard, WidgetCard, EmptyRow } from "@/components/dashboard/widgets"
import { cn } from "@/lib/utils"
import type { Employee } from "@/types"

/** 'YYYY-MM-DD'에 n일을 더한 날짜(로컬, 순수). */
function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number)
  const dt = new Date(y, m - 1, day)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export async function EmployeeBoard({ me }: { me: Employee }) {
  const supabase = await createClient()
  const today = getKstDateString(new Date())
  const month = getKstYearMonth(new Date())
  const monthStart = `${month}-01`
  const in14 = addDays(today, 14)

  const [myAtt, myReport, myMissionsR, myApprovalsR, myAttMonthR, myLeavesR, noticesR] =
    await Promise.all([
      supabase
        .from("attendance")
        .select("check_in_at, check_out_at, is_late")
        .eq("employee_id", me.id)
        .eq("work_date", today)
        .maybeSingle(),
      supabase
        .from("reports")
        .select("id")
        .eq("employee_id", me.id)
        .eq("report_type", "daily")
        .eq("report_date", today)
        .maybeSingle(),
      supabase
        .from("missions")
        .select("id, title, progress, status, period_end")
        .eq("employee_id", me.id)
        .in("status", ["승인", "진행"])
        .order("period_end", { ascending: true }),
      supabase
        .from("approvals")
        .select("id, title, status")
        .eq("applicant_id", me.id)
        .in("status", ["대기", "반려"])
        .order("created_at", { ascending: false }),
      supabase
        .from("attendance")
        .select("is_late")
        .eq("employee_id", me.id)
        .gte("work_date", monthStart),
      supabase
        .from("leaves")
        .select("leave_type, start_date, end_date, status")
        .eq("employee_id", me.id)
        .gte("end_date", today)
        .order("start_date", { ascending: true }),
      supabase
        .from("board_posts")
        .select("id, title, category, created_at")
        .neq("category", "건의")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

  const att = myAtt.data as { check_in_at: string | null; check_out_at: string | null; is_late: boolean } | null
  const reported = !!myReport.data
  const missions = (myMissionsR.data ?? []) as {
    id: string
    title: string
    progress: number
    status: string
    period_end: string | null
  }[]
  const avgProg = missions.length
    ? Math.round(missions.reduce((s, m) => s + (m.progress || 0), 0) / missions.length)
    : 0
  const approvals = (myApprovalsR.data ?? []) as { id: string; title: string; status: string }[]
  const rejected = approvals.filter((a) => a.status === "반려")
  const pendingAp = approvals.filter((a) => a.status === "대기")
  const lateMonth = ((myAttMonthR.data ?? []) as { is_late: boolean }[]).filter((r) => r.is_late).length
  const leaveRemain = (Number(me.annual_leave_total) || 0) - (Number(me.annual_leave_used) || 0)
  const myLeaves = (myLeavesR.data ?? []) as {
    leave_type: string
    start_date: string
    end_date: string
    status: string
  }[]
  const notices = (noticesR.data ?? []) as {
    id: string
    title: string
    category: string
    created_at: string
  }[]

  // 할 일
  const todos: { text: string; href: string; urgent: boolean }[] = []
  if (!att?.check_in_at) todos.push({ text: "오늘 출근 미체크", href: "/attendance", urgent: true })
  if (!reported) todos.push({ text: "오늘 일일보고 미작성", href: "/reports/new", urgent: true })
  if (rejected.length)
    todos.push({ text: `반려된 결재 ${rejected.length}건 확인`, href: "/approvals", urgent: true })
  for (const m of missions.filter((m) => m.period_end && m.period_end <= in14))
    todos.push({ text: `미션 마감 임박 · ${m.title}`, href: "/missions", urgent: false })

  // 다가오는 일정 (내 휴가 + 미션 마감)
  const upcoming: { date: string; label: string; kind: string }[] = []
  for (const l of myLeaves)
    upcoming.push({ date: l.start_date, label: `${l.leave_type}${l.status === "대기" ? " (승인대기)" : ""}`, kind: "leave" })
  for (const m of missions)
    if (m.period_end) upcoming.push({ date: m.period_end, label: `미션 마감 · ${m.title}`, kind: "mission" })
  upcoming.sort((a, b) => a.date.localeCompare(b.date))

  const checkIn = att?.check_in_at ? formatKstTime(att.check_in_at) : null

  return (
    <div className="space-y-4">
      {/* 내 오늘 KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="오늘 출퇴근"
          value={checkIn ? checkIn : "미체크"}
          sub={
            att?.check_in_at
              ? att.check_out_at
                ? `퇴근 ${formatKstTime(att.check_out_at)}`
                : att.is_late
                  ? "지각"
                  : "근무 중"
              : "출근 체크가 필요해요"
          }
          tone={checkIn ? (att?.is_late ? "text-amber-600" : "text-emerald-600") : "text-red-600"}
          href="/attendance"
        />
        <StatCard
          icon={FileText}
          label="오늘 일일보고"
          value={reported ? "작성 완료" : "미작성"}
          sub={reported ? "수고하셨어요" : "오늘 보고를 작성하세요"}
          tone={reported ? "text-emerald-600" : "text-red-600"}
          href={reported ? "/reports" : "/reports/new"}
        />
        <StatCard
          icon={Target}
          label="진행 중 나의 업무"
          value={`${missions.length}건`}
          sub={missions.length ? `평균 진행률 ${avgProg}%` : "진행 중인 업무 없음"}
          href="/missions"
        />
        <StatCard
          icon={Stamp}
          label="내 전자결재"
          value={`대기 ${pendingAp.length}`}
          sub={rejected.length ? `반려 ${rejected.length}건 확인 필요` : "반려 없음"}
          tone={rejected.length ? "text-red-600" : undefined}
          href="/approvals"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 할 일 */}
        <WidgetCard title="내가 해야 할 일" icon={ListTodo}>
          {todos.length === 0 ? (
            <EmptyRow>오늘 처리할 일이 없습니다. 👍</EmptyRow>
          ) : (
            <ul className="space-y-1.5">
              {todos.map((t, i) => (
                <li key={i}>
                  <Link
                    href={t.href}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40"
                  >
                    <CircleAlert
                      className={cn("size-4 shrink-0", t.urgent ? "text-red-500" : "text-amber-500")}
                    />
                    <span className="flex-1">{t.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        {/* 내 미션 진행률 */}
        <WidgetCard title="나의 업무 진행률" icon={Target} href="/missions">
          {missions.length === 0 ? (
            <EmptyRow>진행 중인 업무가 없습니다.</EmptyRow>
          ) : (
            <ul className="space-y-2.5">
              {missions.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{m.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{m.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${m.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        {/* 이번달 근태 */}
        <WidgetCard title="이번 달 근태" icon={Clock} href="/attendance">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-2xl font-bold tabular-nums text-amber-600">{lateMonth}</p>
              <p className="text-xs text-muted-foreground">지각</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-2xl font-bold tabular-nums">{leaveRemain}</p>
              <p className="text-xs text-muted-foreground">연차 잔여(일)</p>
            </div>
          </div>
        </WidgetCard>

        {/* 다가오는 일정 */}
        <WidgetCard title="다가오는 일정" icon={CalendarDays} href="/calendar">
          {upcoming.length === 0 ? (
            <EmptyRow>예정된 일정이 없습니다.</EmptyRow>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.slice(0, 5).map((u, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                    {u.date.slice(5).replace("-", ".")}
                  </span>
                  <span className="truncate">{u.label}</span>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </div>

      {/* 최근 공지 */}
      <WidgetCard title="최근 공지·게시글" icon={Megaphone} href="/board">
        {notices.length === 0 ? (
          <EmptyRow>게시글이 없습니다.</EmptyRow>
        ) : (
          <ul className="divide-y">
            {notices.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/board/${n.id}`}
                  className="flex items-center gap-2 py-2 text-sm hover:text-primary"
                >
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
  )
}
