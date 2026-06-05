import Link from "next/link"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { CreateMissionButton } from "./mission-create"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  작성: "secondary",
  진행: "default",
  완료: "outline",
}
const PERIOD_LABEL: Record<string, string> = {
  daily: "일일",
  weekly: "주간",
  monthly: "월간",
  ongoing: "기한없음",
}

export default async function MissionsPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()

  let q = supabase
    .from("missions")
    .select(
      "id, title, period_type, period_start, period_end, priority, progress, status, employee:employees!employee_id(name), project:projects(tag)"
    )
    .order("created_at", { ascending: false })
    .limit(100)
  if (!admin) q = q.eq("employee_id", me.id)
  const { data } = await q
  const missions = (data ?? []) as unknown as {
    id: string
    title: string
    period_type: string
    period_start: string | null
    period_end: string | null
    priority: string
    progress: number
    status: string
    employee: { name: string } | null
    project: { tag: string | null } | null
  }[]

  let employees: { id: string; name: string }[] = []
  if (admin) {
    const { data: emps } = await supabase
      .from("employees")
      .select("id, name")
      .eq("status", "재직")
      .neq("role", "kiosk")
      .order("name")
    employees = (emps ?? []) as { id: string; name: string }[]
  }

  const { data: projData } = await supabase
    .from("projects")
    .select("id, name, tag")
    .neq("status", "보관")
    .order("created_at", { ascending: false })
  const projects = (projData ?? []) as { id: string; name: string; tag: string | null }[]

  return (
    <div>
      <PageHeader
        title="나의 업무"
        description={admin ? "전체 직원의 주·월간 업무 목표" : "내 주·월간 업무 목표"}
        action={<CreateMissionButton isAdmin={admin} employees={employees} projects={projects} />}
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {admin && <TableHead>담당</TableHead>}
              <TableHead>기간</TableHead>
              <TableHead>제목</TableHead>
              <TableHead className="w-40">진행률</TableHead>
              <TableHead className="text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missions.map((m) => (
              <TableRow key={m.id}>
                {admin && (
                  <TableCell className="font-medium">
                    <Link href={`/missions/${m.id}`} className="hover:underline">
                      {m.employee?.name ?? "-"}
                    </Link>
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-sm">
                  <Badge variant="secondary" className="mr-1">
                    {PERIOD_LABEL[m.period_type] ?? m.period_type}
                  </Badge>
                  <span className="text-muted-foreground">{m.period_start}</span>
                </TableCell>
                <TableCell>
                  <Link href={`/missions/${m.id}`} className="hover:underline">
                    {m.title}
                  </Link>
                  {m.project?.tag && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      #{m.project.tag}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${m.progress}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs tabular-nums">{m.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={STATUS_VARIANT[m.status] ?? "secondary"}>{m.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {missions.length === 0 && (
              <TableRow>
                <TableCell colSpan={admin ? 5 : 4} className="text-center text-muted-foreground">
                  등록된 업무가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
