import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { CheckInOut, type TodayState } from "./attendance-client"
import { Badge } from "@/components/ui/badge"
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
import { AttendanceTabs } from "@/components/dashboard/attendance-tabs"
import { AutoRefresh } from "@/components/dashboard/auto-refresh"
import { weekdaysBetween } from "@/lib/leave"
import { holidaysInRange } from "@/lib/holidays"
import type { Attendance } from "@/types"

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  정상: "default",
  지각: "secondary",
  조기퇴근: "secondary",
  결근: "destructive",
  휴가: "outline",
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const me = await getCurrentEmployee()
  const sp = await searchParams
  const defaultToken = sp.token ?? ""

  const supabase = await createClient()
  const now = new Date()
  const todayStr = getKstDateString(now)
  const monthStart = `${getKstYearMonth(now)}-01`

  const { data: todayRows } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", me.id)
    .eq("work_date", todayStr)
    .limit(1)
  const todayAtt = todayRows?.[0] as Attendance | undefined

  const { data: monthRows } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", me.id)
    .gte("work_date", monthStart)
    .lte("work_date", todayStr)
    .order("work_date", { ascending: false })
  const month = (monthRows ?? []) as Attendance[]

  // 승인된 휴가 (결근 계산 제외용)
  const { data: leaveData } = await supabase
    .from("leaves")
    .select("start_date, end_date")
    .eq("employee_id", me.id)
    .eq("status", "승인")
    .lte("start_date", todayStr)
    .gte("end_date", monthStart)
  const leaveDates = new Set<string>()
  for (const l of leaveData ?? []) {
    for (const d of weekdaysBetween(l.start_date as string, l.end_date as string)) {
      leaveDates.add(d)
    }
  }

  // 결근: 이번 달 평일(오늘·공휴일 제외) 중 출근기록·휴가 없는 날
  const attendanceDates = new Set(month.map((a) => a.work_date))
  const holidaySet = holidaysInRange(monthStart, todayStr)
  const absentDates = weekdaysBetween(monthStart, todayStr).filter(
    (d) =>
      d < todayStr &&
      !attendanceDates.has(d) &&
      !leaveDates.has(d) &&
      !holidaySet.has(d)
  )
  const absentDays = absentDates.length

  // 기록 표시용(출근 기록 + 결근 합쳐 최신순)
  const displayRows = [
    ...month.map((a) => ({
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
      checkIn: null as string | null,
      checkOut: null as string | null,
      work: null as string | null,
      status: "결근",
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  // 통계
  const presentDays = month.length
  const lateDays = month.filter((a) => a.is_late).length
  const earlyDays = month.filter((a) => a.is_early_leave).length
  const totalMin = month.reduce((s, a) => s + (a.work_minutes ?? 0), 0)
  const checkInMins = month
    .filter((a) => a.check_in_at)
    .map((a) => {
      const { hours, minutes } = getKstHm(new Date(a.check_in_at!))
      return hours * 60 + minutes
    })
  const avgMin = checkInMins.length
    ? Math.round(checkInMins.reduce((s, m) => s + m, 0) / checkInMins.length)
    : null
  const avgText =
    avgMin != null
      ? `${String(Math.floor(avgMin / 60)).padStart(2, "0")}:${String(avgMin % 60).padStart(2, "0")}`
      : "-"

  const today: TodayState = {
    checkedIn: !!todayAtt?.check_in_at,
    checkedOut: !!todayAtt?.check_out_at,
    checkInTime: formatKstTime(todayAtt?.check_in_at),
    checkOutTime: formatKstTime(todayAtt?.check_out_at),
    status: todayAtt?.status ?? null,
    workText: formatWorkMinutes(todayAtt?.work_minutes),
  }

  // 관리자 현황판
  let board: {
    name: string
    state: "근무중" | "퇴근" | "미출근"
    checkIn: string | null
    late: boolean
  }[] = []
  if (isAdmin(me)) {
    const { data: emps } = await supabase
      .from("employees")
      .select("id, name")
      .eq("status", "재직")
      .neq("role", "kiosk")
      .neq("role", "admin")
      .order("name")
    const { data: todayAll } = await supabase
      .from("attendance")
      .select("employee_id, check_in_at, check_out_at, is_late")
      .eq("work_date", todayStr)
    const map = new Map(
      (todayAll ?? []).map((a) => [a.employee_id as string, a])
    )
    board = (emps ?? []).map((e) => {
      const a = map.get(e.id as string)
      return {
        name: e.name as string,
        state: !a?.check_in_at ? "미출근" : a.check_out_at ? "퇴근" : "근무중",
        checkIn: formatKstTime(a?.check_in_at),
        late: !!a?.is_late,
      }
    })
  }
  const presentCount = board.filter((b) => b.state !== "미출근").length

  return (
    <div>
      <PageHeader title="근태관리" description="출퇴근 체크 · 이번 달 근태 현황" />
      <AttendanceTabs isAdmin={isAdmin(me)} />
      {isAdmin(me) && <AutoRefresh seconds={30} />}

      {/* 관리자: 오늘 출근 현황판 */}
      {isAdmin(me) && (
        <div className="mb-6 rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">오늘 출근 현황</h2>
            <Badge variant="secondary">
              {presentCount} / {board.length} 출근
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{b.name}</span>
                <span className="flex items-center gap-2">
                  {b.checkIn && (
                    <span className="text-muted-foreground tabular-nums">{b.checkIn}</span>
                  )}
                  {b.late && <Badge variant="secondary" className="text-[10px]">지각</Badge>}
                  <Badge
                    variant={
                      b.state === "근무중"
                        ? "default"
                        : b.state === "퇴근"
                          ? "outline"
                          : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {b.state}
                  </Badge>
                </span>
              </div>
            ))}
            {board.length === 0 && (
              <p className="text-sm text-muted-foreground">재직 직원이 없습니다.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 출퇴근 + 기록 */}
        <div className="space-y-6 lg:col-span-2">
          <CheckInOut today={today} defaultToken={defaultToken} />

          <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="border-b px-4 py-3 font-semibold">이번 달 기록</div>
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
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {displayRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      이번 달 근태 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 통계 패널 (우측) */}
        <div className="space-y-3">
          <h2 className="font-semibold">이번 달 통계</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="출근일수" value={`${presentDays}일`} />
            <Stat label="결근" value={`${absentDays}일`} />
            <Stat label="지각" value={`${lateDays}회`} />
            <Stat label="조기퇴근" value={`${earlyDays}회`} />
          </div>
          <Stat label="평균 출근" value={avgText} />
          <Stat
            label="총 근무시간"
            value={formatWorkMinutes(totalMin) ?? "0시간 0분"}
            hint="이번 달 누계"
          />
        </div>
      </div>
    </div>
  )
}
