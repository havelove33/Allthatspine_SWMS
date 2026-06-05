import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { AttendanceTabs } from "@/components/dashboard/attendance-tabs"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  formatKstTime,
  formatWorkMinutes,
  getKstDateString,
  getKstYearMonth,
  getKstHm,
} from "@/lib/attendance"
import { weekdaysBetween } from "@/lib/leave"
import { holidaysInRange } from "@/lib/holidays"
import type { Attendance } from "@/types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  정상: "default",
  지각: "secondary",
  조기퇴근: "secondary",
  결근: "destructive",
  휴가: "outline",
}

function shiftMonth(ym: string, delta: number) {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7)) - 1 + delta
  const d = new Date(Date.UTC(y, m, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export default async function ByEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ emp?: string; month?: string }>
}) {
  await requireRole(["admin"])
  const sp = await searchParams
  const supabase = await createClient()

  const { data: empsData } = await supabase
    .from("employees")
    .select("id, name")
    .eq("status", "재직")
    .neq("role", "kiosk")
    .neq("role", "admin")
    .order("name")
  const emps = (empsData ?? []) as { id: string; name: string }[]

  const empId = sp.emp && emps.some((e) => e.id === sp.emp) ? sp.emp : emps[0]?.id
  const thisMonth = getKstYearMonth(new Date())
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : thisMonth
  const today = getKstDateString(new Date())

  const monthStart = `${month}-01`
  const monthEnd = (() => {
    const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    return d.toISOString().slice(0, 10)
  })()

  let month_rows: Attendance[] = []
  let stats = { present: 0, late: 0, early: 0, absent: 0, avg: "-", totalText: "0시간 0분" }
  let displayRows: {
    key: string
    date: string
    checkIn: string | null
    checkOut: string | null
    work: string | null
    status: string
  }[] = []

  if (empId) {
    const { data: attData } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", empId)
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .order("work_date", { ascending: false })
    month_rows = (attData ?? []) as Attendance[]

    const { data: leaveData } = await supabase
      .from("leaves")
      .select("start_date, end_date")
      .eq("employee_id", empId)
      .eq("status", "승인")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
    const leaveDates = new Set<string>()
    for (const l of leaveData ?? []) {
      for (const d of weekdaysBetween(l.start_date as string, l.end_date as string)) leaveDates.add(d)
    }

    const attDates = new Set(month_rows.map((a) => a.work_date))
    const holidaySet = holidaysInRange(monthStart, monthEnd)
    const absentDates = weekdaysBetween(monthStart, monthEnd).filter(
      (d) => d < today && !attDates.has(d) && !leaveDates.has(d) && !holidaySet.has(d)
    )

    const checkInMins = month_rows
      .filter((a) => a.check_in_at)
      .map((a) => {
        const { hours, minutes } = getKstHm(new Date(a.check_in_at!))
        return hours * 60 + minutes
      })
    const avgMin = checkInMins.length
      ? Math.round(checkInMins.reduce((s, m) => s + m, 0) / checkInMins.length)
      : null
    const totalMin = month_rows.reduce((s, a) => s + (a.work_minutes ?? 0), 0)

    stats = {
      present: month_rows.length,
      late: month_rows.filter((a) => a.is_late).length,
      early: month_rows.filter((a) => a.is_early_leave).length,
      absent: absentDates.length,
      avg:
        avgMin != null
          ? `${String(Math.floor(avgMin / 60)).padStart(2, "0")}:${String(avgMin % 60).padStart(2, "0")}`
          : "-",
      totalText: formatWorkMinutes(totalMin) ?? "0시간 0분",
    }

    displayRows = [
      ...month_rows.map((a) => ({
        key: a.id,
        date: a.work_date,
        checkIn: formatKstTime(a.check_in_at),
        checkOut: formatKstTime(a.check_out_at),
        work: formatWorkMinutes(a.work_minutes),
        status: a.status as string,
      })),
      ...absentDates.map((d) => ({
        key: `absent-${d}`,
        date: d,
        checkIn: null,
        checkOut: null,
        work: null,
        status: "결근",
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  return (
    <div>
      <PageHeader title="직원별 근태" description="직원별 월간 근태 현황" />
      <AttendanceTabs isAdmin />

      {/* 직원 선택 */}
      <div className="mb-4 flex flex-wrap gap-1">
        {emps.map((e) => (
          <Link
            key={e.id}
            href={`/attendance/by-employee?emp=${e.id}&month=${month}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              e.id === empId ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:text-foreground"
            )}
          >
            {e.name}
          </Link>
        ))}
        {emps.length === 0 && <p className="text-sm text-muted-foreground">재직 직원이 없습니다.</p>}
      </div>

      {empId && (
        <>
          {/* 월 이동 */}
          <div className="mb-4 flex items-center gap-2">
            <Link
              href={`/attendance/by-employee?emp=${empId}&month=${shiftMonth(month, -1)}`}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-[90px] text-center font-semibold">{month}</span>
            <Link
              href={`/attendance/by-employee?emp=${empId}&month=${shiftMonth(month, 1)}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                month >= thisMonth && "pointer-events-none opacity-40"
              )}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="출근일" value={`${stats.present}일`} />
            <Stat label="결근" value={`${stats.absent}일`} />
            <Stat label="지각" value={`${stats.late}회`} />
            <Stat label="조기퇴근" value={`${stats.early}회`} />
            <Stat label="평균 출근" value={stats.avg} />
            <Stat label="총 근무" value={stats.totalText} />
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>출근</TableHead>
                  <TableHead>퇴근</TableHead>
                  <TableHead>근무</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="tabular-nums">{r.checkIn ?? "-"}</TableCell>
                    <TableCell className="tabular-nums">{r.checkOut ?? "-"}</TableCell>
                    <TableCell>{r.work ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {displayRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      이 달 근태 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
