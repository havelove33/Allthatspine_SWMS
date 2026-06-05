import Link from "next/link"
import { Plus } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { formatKstTime, getKstDateString } from "@/lib/attendance"

const TYPE_LABEL: Record<string, string> = {
  daily: "일일",
  weekly: "주간",
  monthly: "월간",
}

export default async function ReportsPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()

  let q = supabase
    .from("reports")
    .select(
      "id, report_type, report_date, period_start, period_end, submitted_at, employee:employees!employee_id(name), links:report_project_links(project:projects(tag))"
    )
    .order("submitted_at", { ascending: false })
    .limit(100)
  if (!admin) q = q.eq("employee_id", me.id)
  const { data } = await q
  const reports = (data ?? []) as unknown as {
    id: string
    report_type: string
    report_date: string | null
    period_start: string | null
    period_end: string | null
    submitted_at: string | null
    employee: { name: string } | null
    links: { project: { tag: string | null } | null }[]
  }[]

  return (
    <div>
      <PageHeader
        title="업무보고"
        description={admin ? "전체 직원의 업무보고" : "내 업무보고"}
        action={
          <Link href="/reports/new" className={cn(buttonVariants())}>
            <Plus className="size-4" />새 보고 작성
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {admin && <TableHead>작성자</TableHead>}
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>프로젝트</TableHead>
              <TableHead>제출</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => {
              const period =
                r.report_type === "daily"
                  ? r.report_date
                  : `${r.period_start ?? ""} ~ ${r.period_end ?? ""}`
              const tags = Array.from(
                new Set(r.links.map((l) => l.project?.tag).filter(Boolean))
              ) as string[]
              return (
                <TableRow key={r.id}>
                  {admin && (
                    <TableCell className="font-medium">
                      <Link href={`/reports/${r.id}`} className="hover:underline">
                        {r.employee?.name ?? "-"}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell>
                    <Link href={`/reports/${r.id}`} className="hover:underline">
                      <Badge variant="secondary">{TYPE_LABEL[r.report_type] ?? r.report_type}</Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/reports/${r.id}`} className="hover:underline">
                      {period}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.submitted_at
                      ? `${getKstDateString(new Date(r.submitted_at))} ${formatKstTime(r.submitted_at)}`
                      : "-"}
                  </TableCell>
                </TableRow>
              )
            })}
            {reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={admin ? 5 : 4} className="text-center text-muted-foreground">
                  작성된 보고가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
