import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { AttendanceTabs } from "@/components/dashboard/attendance-tabs"
import { YearlyChart, type MonthStat } from "./yearly-chart"
import { getKstDateString, formatWorkMinutes } from "@/lib/attendance"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export default async function YearlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; scope?: string }>
}) {
  const me = await getCurrentEmployee()
  const sp = await searchParams
  const admin = isAdmin(me)

  const curYear = Number(getKstDateString(new Date()).slice(0, 4))
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : curYear
  const scope: "personal" | "company" =
    admin && sp.scope === "company" ? "company" : "personal"

  const supabase = await createClient()
  let q = supabase
    .from("attendance")
    .select("work_date, is_late, is_early_leave, work_minutes")
    .gte("work_date", `${year}-01-01`)
    .lte("work_date", `${year}-12-31`)
  if (scope === "personal") q = q.eq("employee_id", me.id)
  const { data } = await q
  const rows = (data ?? []) as {
    work_date: string
    is_late: boolean
    is_early_leave: boolean
    work_minutes: number | null
  }[]

  const months: MonthStat[] = Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}월`,
    출근일: 0,
    지각: 0,
    조기퇴근: 0,
  }))
  let totalMin = 0
  for (const r of rows) {
    const m = Number(r.work_date.slice(5, 7)) - 1
    if (m < 0 || m > 11) continue
    months[m].출근일++
    if (r.is_late) months[m].지각++
    if (r.is_early_leave) months[m].조기퇴근++
    totalMin += r.work_minutes ?? 0
  }
  const totalLate = rows.filter((r) => r.is_late).length
  const totalEarly = rows.filter((r) => r.is_early_leave).length

  const yLink = (y: number, s = scope) =>
    `/attendance/yearly?year=${y}${s === "company" ? "&scope=company" : ""}`
  const sLink = (s: "personal" | "company") =>
    `/attendance/yearly?year=${year}${s === "company" ? "&scope=company" : ""}`

  return (
    <div>
      <PageHeader title="연간 통계" description="월별 출근·지각·조기퇴근 추이" />
      <AttendanceTabs isAdmin={admin} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* 연도 이동 */}
        <div className="flex items-center gap-2">
          <Link href={yLink(year - 1)} className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-[64px] text-center text-lg font-semibold">{year}년</span>
          <Link
            href={yLink(Math.min(year + 1, curYear))}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), year >= curYear && "pointer-events-none opacity-40")}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* 개인 / 전사 (관리자만) */}
        {admin && (
          <div className="flex gap-1 rounded-md border p-1">
            <Link
              href={sLink("personal")}
              className={cn("rounded px-3 py-1 text-sm", scope === "personal" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              개인
            </Link>
            <Link
              href={sLink("company")}
              className={cn("rounded px-3 py-1 text-sm", scope === "company" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              전사
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="총 출근일" value={`${rows.length}일`} />
        <Stat label="총 지각" value={`${totalLate}회`} />
        <Stat label="총 조기퇴근" value={`${totalEarly}회`} />
        <Stat label="총 근무시간" value={formatWorkMinutes(totalMin) ?? "0시간 0분"} />
      </div>

      <YearlyChart data={months} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
