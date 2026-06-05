import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCurrentEmployee } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { CommentThread, type CommentNode } from "./comments-client"
import { getKstDateString, formatKstTime } from "@/lib/attendance"
import type { TemplateField } from "@/types"

const TYPE_LABEL: Record<string, string> = {
  daily: "일일",
  weekly: "주간",
  monthly: "월간",
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getCurrentEmployee()
  const { id } = await params
  const supabase = await createClient()

  const { data: report } = await supabase
    .from("reports")
    .select(
      "*, employee:employees!employee_id(name), links:report_project_links(hours, project:projects(name, tag))"
    )
    .eq("id", id)
    .single()
  if (!report) notFound()

  const { data: tplRows } = await supabase
    .from("report_templates")
    .select("fields")
    .eq("report_type", report.report_type)
    .limit(1)
  const fields: TemplateField[] = tplRows?.[0]?.fields ?? []

  const { data: commentsData } = await supabase
    .from("report_comments")
    .select("id, author_id, parent_comment_id, content, created_at, author:employees!author_id(name)")
    .eq("report_id", id)
    .order("created_at", { ascending: true })
  const comments: CommentNode[] = (commentsData ?? []).map((c) => {
    const row = c as unknown as {
      id: string
      author_id: string
      parent_comment_id: string | null
      content: string
      created_at: string
      author: { name: string } | null
    }
    return {
      id: row.id,
      author_id: row.author_id,
      parent_comment_id: row.parent_comment_id,
      content: row.content,
      created_at: row.created_at,
      authorName: row.author?.name ?? "?",
    }
  })

  const { data: projData } = await supabase.from("projects").select("id, name, tag")
  const projMap = new Map(
    (projData ?? []).map((p) => [p.id as string, p as { name: string; tag: string | null }])
  )

  const content = (report.content ?? {}) as Record<string, unknown>
  const isDaily = report.report_type === "daily"
  const dailyItems =
    isDaily && Array.isArray((content as { items?: unknown }).items)
      ? ((content as { items: { title: string; projectId: string; hours: string; status: string }[] }).items)
      : []
  const links = (report.links ?? []) as { hours: number; project: { name: string; tag: string | null } | null }[]
  const period =
    report.report_type === "daily"
      ? report.report_date
      : `${report.period_start ?? ""} ~ ${report.period_end ?? ""}`

  function renderValue(f: TemplateField) {
    const v = content[f.key]
    if (v == null || v === "") return "-"
    if (Array.isArray(v)) return v.join(", ")
    return String(v)
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/reports"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> 목록으로
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge>{TYPE_LABEL[report.report_type] ?? report.report_type}</Badge>
        <h1 className="text-xl font-bold">{period}</h1>
        <span className="text-sm text-muted-foreground">
          · {report.employee?.name}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          제출 {report.submitted_at ? `${getKstDateString(new Date(report.submitted_at))} ${formatKstTime(report.submitted_at)}` : "-"}
        </span>
      </div>

      {/* 내용 */}
      {isDaily ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>업무 내용</TableHead>
                <TableHead>프로젝트</TableHead>
                <TableHead className="text-center">시간</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyItems.map((it, i) => {
                const proj = projMap.get(it.projectId)
                return (
                  <TableRow key={i}>
                    <TableCell className="whitespace-pre-wrap">{it.title}</TableCell>
                    <TableCell>
                      {proj ? (
                        <Badge variant="outline">#{proj.tag ?? proj.name}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">{it.hours ? `${it.hours}h` : "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{it.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {dailyItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    기록된 업무가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-card p-5">
          {fields.map((f) => (
            <div key={f.key}>
              <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{renderValue(f)}</p>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">표시할 내용이 없습니다.</p>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">연관 프로젝트</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {links.map((l, i) => (
                <Badge key={i} variant="outline">
                  #{l.project?.tag ?? l.project?.name}
                  {l.hours ? ` · ${l.hours}h` : ""}
                </Badge>
              ))}
              {links.length === 0 && <span className="text-sm text-muted-foreground">-</span>}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <CommentThread reportId={id} comments={comments} />
      </div>
    </div>
  )
}
