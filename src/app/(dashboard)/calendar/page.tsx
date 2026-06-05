import { getCurrentEmployee } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getKstDateString } from "@/lib/attendance"
import { holidaysInRange } from "@/lib/holidays"
import { PageHeader } from "@/components/dashboard/page-header"
import { CalendarClient, type CalEvent } from "./calendar-client"

function eachDay(start: string, end: string): string[] {
  const out: string[] = []
  const [ys, ms, ds] = start.split("-").map(Number)
  const [ye, me, de] = end.split("-").map(Number)
  const cur = new Date(ys, ms - 1, ds)
  const last = new Date(ye, me - 1, de)
  let guard = 0
  while (cur <= last && guard < 370) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
        cur.getDate()
      ).padStart(2, "0")}`
    )
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return out
}

export default async function CalendarPage() {
  const me = await getCurrentEmployee()
  const supabase = await createClient()

  const today = getKstDateString(new Date())
  const year = Number(today.slice(0, 4))
  const rangeStart = `${year - 1}-12-01`
  const rangeEnd = `${year + 1}-01-31`

  const [evRes, leaveRes, msRes, projRes, missionRes] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, event_type, start_date, end_date, owner_id")
      .gte("start_date", rangeStart)
      .lte("start_date", rangeEnd),
    supabase
      .from("leaves")
      .select("start_date, end_date, leave_type, employee:employees!employee_id(name)")
      .eq("status", "승인")
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart),
    supabase
      .from("project_milestones")
      .select("title, date, project:projects(name)")
      .gte("date", rangeStart)
      .lte("date", rangeEnd),
    supabase
      .from("projects")
      .select("name, end_date")
      .gte("end_date", rangeStart)
      .lte("end_date", rangeEnd),
    supabase
      .from("missions")
      .select("title, period_end, employee:employees!employee_id(name)")
      .gte("period_end", rangeStart)
      .lte("period_end", rangeEnd),
  ])

  const events: CalEvent[] = []

  // 직접 등록 일정
  const myEvents: { id: string; title: string; event_type: string; start_date: string; end_date: string | null }[] = []
  for (const e of (evRes.data ?? []) as unknown as {
    id: string
    title: string
    event_type: string
    start_date: string
    end_date: string | null
    owner_id: string | null
  }[]) {
    const days = e.end_date ? eachDay(e.start_date, e.end_date) : [e.start_date]
    for (const d of days) events.push({ date: d, kind: e.event_type, title: e.title })
    if (e.owner_id === me.id)
      myEvents.push({
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        start_date: e.start_date,
        end_date: e.end_date,
      })
  }

  // 휴가(부재)
  const absences: { name: string; leave_type: string; start_date: string; end_date: string }[] = []
  for (const l of (leaveRes.data ?? []) as unknown as {
    start_date: string
    end_date: string
    leave_type: string
    employee: { name: string } | null
  }[]) {
    const name = l.employee?.name ?? "직원"
    for (const d of eachDay(l.start_date, l.end_date))
      events.push({ date: d, kind: "leave", title: `${name} ${l.leave_type}` })
    if (l.end_date >= today) absences.push({ name, leave_type: l.leave_type, start_date: l.start_date, end_date: l.end_date })
  }

  // 마일스톤
  for (const m of (msRes.data ?? []) as unknown as {
    title: string
    date: string
    project: { name: string } | null
  }[]) {
    events.push({ date: m.date, kind: "milestone", title: `${m.project?.name ? m.project.name + " " : ""}${m.title}` })
  }

  // 프로젝트 기한
  for (const p of (projRes.data ?? []) as unknown as { name: string; end_date: string }[]) {
    events.push({ date: p.end_date, kind: "deadline", title: `${p.name} 기한` })
  }

  // 미션 마감
  for (const ms of (missionRes.data ?? []) as unknown as {
    title: string
    period_end: string | null
    employee: { name: string } | null
  }[]) {
    if (ms.period_end)
      events.push({ date: ms.period_end, kind: "mission", title: `${ms.employee?.name ?? ""} 미션: ${ms.title}` })
  }

  // 공휴일
  for (const d of holidaysInRange(rangeStart, rangeEnd)) {
    events.push({ date: d, kind: "holiday", title: "공휴일" })
  }

  absences.sort((a, b) => a.start_date.localeCompare(b.start_date))

  return (
    <div>
      <PageHeader title="캘린더" description="휴가 · 마일스톤 · 미션 · 일정 통합 보기" />
      <CalendarClient events={events} myEvents={myEvents} absences={absences} today={today} />
    </div>
  )
}
