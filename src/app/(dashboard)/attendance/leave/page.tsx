import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { AttendanceTabs } from "@/components/dashboard/attendance-tabs"
import {
  computeAnnualEntitlement,
  currentLeaveYearStart,
  leaveTypeDef,
} from "@/lib/leave"
import { getKstDateString } from "@/lib/attendance"
import { LeaveRequestForm, LeaveApproveButtons } from "./leave-client"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  대기: "secondary",
  승인: "default",
  반려: "destructive",
}

export default async function LeavePage() {
  const me = await getCurrentEmployee()
  const supabase = await createClient()

  const { data: myLeavesData } = await supabase
    .from("leaves")
    .select("*")
    .eq("employee_id", me.id)
    .order("created_at", { ascending: false })
  const myLeaves = myLeavesData ?? []

  // 발생 연차(입사일 기준 법정) · 사용(현재 연차연도 승인분) · 잔여
  const today = getKstDateString(new Date())
  const entitlement = computeAnnualEntitlement(me.hire_date, today)
  const yearStart = currentLeaveYearStart(me.hire_date, today)
  const usedThisYear = (myLeaves as { status: string; leave_type: string; days: number; start_date: string }[])
    .filter(
      (l) =>
        l.status === "승인" &&
        leaveTypeDef(l.leave_type)?.consumes &&
        (!yearStart || l.start_date >= yearStart)
    )
    .reduce((s, l) => s + Number(l.days), 0)
  const remaining = entitlement - usedThisYear

  let pending: Record<string, unknown>[] = []
  if (isAdmin(me)) {
    const { data } = await supabase
      .from("leaves")
      .select("*, employee:employees!employee_id(name)")
      .eq("status", "대기")
      .order("created_at", { ascending: true })
    pending = data ?? []
  }

  return (
    <div>
      <PageHeader title="휴가" description="연차·반차 신청 및 승인" />
      <AttendanceTabs isAdmin={isAdmin(me)} />

      {!me.hire_date && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          입사일이 등록되지 않아 연차가 계산되지 않습니다. 관리자에게 입사일 등록을 요청하세요.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">발생 연차</p>
          <p className="text-2xl font-bold">{entitlement}일</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">사용 연차</p>
          <p className="text-2xl font-bold">{usedThisYear}일</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">잔여 연차</p>
          <p className="text-2xl font-bold text-primary">{remaining}일</p>
        </div>
      </div>
      <p className="mb-5 mt-2 text-xs text-muted-foreground">
        입사일 기준 자동 계산(근로기준법)
        {yearStart ? ` · 올해 연차연도 ${yearStart} 시작` : ""}
      </p>

      {/* 관리자: 승인 대기 */}
      {isAdmin(me) && (
        <div className="mb-6 overflow-x-auto rounded-lg border bg-card">
          <div className="border-b px-4 py-3 font-semibold">
            승인 대기 ({pending.length})
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신청자</TableHead>
                <TableHead>종류</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="text-center">일수</TableHead>
                <TableHead>사유</TableHead>
                <TableHead className="text-right">처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((l) => {
                const row = l as {
                  id: string
                  leave_type: string
                  start_date: string
                  end_date: string
                  days: number
                  reason: string | null
                  employee: { name: string } | null
                }
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employee?.name ?? "-"}</TableCell>
                    <TableCell>{row.leave_type}</TableCell>
                    <TableCell>
                      {row.start_date}
                      {row.end_date !== row.start_date ? ` ~ ${row.end_date}` : ""}
                    </TableCell>
                    <TableCell className="text-center">{row.days}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {row.reason ?? "-"}
                    </TableCell>
                    <TableCell>
                      <LeaveApproveButtons leaveId={row.id} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    승인 대기 중인 휴가가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <LeaveRequestForm />

      {/* 내 휴가 내역 */}
      <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <div className="border-b px-4 py-3 font-semibold">내 휴가 내역</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>종류</TableHead>
              <TableHead>기간</TableHead>
              <TableHead className="text-center">일수</TableHead>
              <TableHead>사유</TableHead>
              <TableHead className="text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myLeaves.map((l) => {
              const row = l as {
                id: string
                leave_type: string
                start_date: string
                end_date: string
                days: number
                reason: string | null
                status: string
              }
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.leave_type}</TableCell>
                  <TableCell>
                    {row.start_date}
                    {row.end_date !== row.start_date ? ` ~ ${row.end_date}` : ""}
                  </TableCell>
                  <TableCell className="text-center">{row.days}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {row.reason ?? "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {myLeaves.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  휴가 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
