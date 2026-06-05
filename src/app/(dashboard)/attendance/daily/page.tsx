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
import { formatKstTime, formatWorkMinutes, getKstDateString } from "@/lib/attendance"
import { isKoreanHoliday } from "@/lib/holidays"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  정상: "default",
  지각: "secondary",
  조기퇴근: "secondary",
  결근: "destructive",
  휴가: "outline",
  미출근: "secondary",
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function DailyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await requireRole(["admin"])
  const sp = await searchParams
  const today = getKstDateString(new Date())
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today

  const supabase = await createClient()
  const { data: emps } = await supabase
    .from("employees")
    .select("id, name, position")
    .eq("status", "재직")
    .neq("role", "kiosk")
    .order("name")
  const { data: attData } = await supabase.from("attendance").select("*").eq("work_date", date)
  const { data: leaveData } = await supabase
    .from("leaves")
    .select("employee_id, leave_type")
    .eq("status", "승인")
    .lte("start_date", date)
    .gte("end_date", date)

  const attMap = new Map((attData ?? []).map((a) => [a.employee_id as string, a]))
  const leaveMap = new Map((leaveData ?? []).map((l) => [l.employee_id as string, l]))

  const dow = new Date(date + "T00:00:00Z").getUTCDay()
  const isWeekend = dow === 0 || dow === 6
  const holiday = isKoreanHoliday(date)
  const isPast = date < today

  const rows = (emps ?? []).map((e) => {
    const a = attMap.get(e.id as string)
    if (a?.check_in_at) {
      return {
        name: e.name as string,
        position: (e.position as string) ?? "-",
        status: a.status as string,
        late: !!a.is_late,
        checkIn: formatKstTime(a.check_in_at),
        checkOut: formatKstTime(a.check_out_at),
        work: formatWorkMinutes(a.work_minutes),
      }
    }
    const leave = leaveMap.get(e.id as string)
    if (leave) {
      return {
        name: e.name as string,
        position: (e.position as string) ?? "-",
        status: "휴가",
        sub: leave.leave_type as string,
        checkIn: null,
        checkOut: null,
        work: null,
        late: false,
      }
    }
    const status = isPast && !isWeekend && !holiday ? "결근" : "미출근"
    return {
      name: e.name as string,
      position: (e.position as string) ?? "-",
      status,
      checkIn: null,
      checkOut: null,
      work: null,
      late: false,
    }
  })

  const count = (s: string) => rows.filter((r) => r.status === s).length
  const present = rows.filter((r) => ["정상", "지각", "조기퇴근"].includes(r.status)).length

  return (
    <div>
      <PageHeader title="일별 현황" description="특정 날짜의 전 직원 근태" />
      <AttendanceTabs isAdmin />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/attendance/daily?date=${shiftDate(date, -1)}`}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-[120px] text-center font-semibold">{date}</span>
          <Link
            href={`/attendance/daily?date=${shiftDate(date, 1)}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              date >= today && "pointer-events-none opacity-40"
            )}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {(isWeekend || holiday) && (
          <Badge variant="outline">{holiday ? "공휴일" : "주말"}</Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">출근 {present}</Badge>
          <Badge variant="secondary">지각 {count("지각")}</Badge>
          <Badge variant="secondary">휴가 {count("휴가")}</Badge>
          <Badge variant="destructive">결근 {count("결근")}</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>직급</TableHead>
              <TableHead>출근</TableHead>
              <TableHead>퇴근</TableHead>
              <TableHead>근무</TableHead>
              <TableHead className="text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.position}</TableCell>
                <TableCell className="tabular-nums">{r.checkIn ?? "-"}</TableCell>
                <TableCell className="tabular-nums">{r.checkOut ?? "-"}</TableCell>
                <TableCell>{r.work ?? "-"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                    {r.status}
                    {"sub" in r && r.sub ? ` (${r.sub})` : ""}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  재직 직원이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
