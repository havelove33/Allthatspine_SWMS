import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { AttendanceTabs } from "@/components/dashboard/attendance-tabs"
import { CorrectionRequestForm, CorrectionApproveButtons } from "./corrections-client"
import { formatKstTime } from "@/lib/attendance"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  대기: "secondary",
  승인: "default",
  반려: "destructive",
}

export default async function CorrectionsPage() {
  const me = await getCurrentEmployee()
  const supabase = await createClient()

  const { data: mineData } = await supabase
    .from("attendance_corrections")
    .select("*")
    .eq("employee_id", me.id)
    .order("created_at", { ascending: false })
  const mine = mineData ?? []

  let pending: Record<string, unknown>[] = []
  if (isAdmin(me)) {
    const { data } = await supabase
      .from("attendance_corrections")
      .select("*, employee:employees!employee_id(name)")
      .eq("status", "대기")
      .order("created_at", { ascending: true })
    pending = data ?? []
  }

  return (
    <div>
      <PageHeader title="출퇴근 정정" description="기록 누락·오류를 정정 요청합니다." />
      <AttendanceTabs isAdmin={isAdmin(me)} />

      {isAdmin(me) && (
        <div className="mb-6 overflow-x-auto rounded-lg border bg-card">
          <div className="border-b px-4 py-3 font-semibold">승인 대기 ({pending.length})</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신청자</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>정정 시각</TableHead>
                <TableHead>사유</TableHead>
                <TableHead className="text-right">처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((c) => {
                const row = c as {
                  id: string
                  work_date: string
                  request_type: string
                  requested_time: string
                  reason: string
                  employee: { name: string } | null
                }
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employee?.name ?? "-"}</TableCell>
                    <TableCell>{row.work_date}</TableCell>
                    <TableCell>{row.request_type}</TableCell>
                    <TableCell className="tabular-nums">{formatKstTime(row.requested_time)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.reason}</TableCell>
                    <TableCell>
                      <CorrectionApproveButtons id={row.id} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    승인 대기 중인 정정 요청이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CorrectionRequestForm />

      <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <div className="border-b px-4 py-3 font-semibold">내 정정 요청</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>정정 시각</TableHead>
              <TableHead>사유</TableHead>
              <TableHead className="text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mine.map((c) => {
              const row = c as {
                id: string
                work_date: string
                request_type: string
                requested_time: string
                reason: string
                status: string
              }
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.work_date}</TableCell>
                  <TableCell>{row.request_type}</TableCell>
                  <TableCell className="tabular-nums">{formatKstTime(row.requested_time)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.reason}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{row.status}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {mine.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  정정 요청 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
