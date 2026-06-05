"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"
import { notify, adminIds } from "@/lib/notify"
import type { TemplateField } from "@/types"

export type ReportInput = {
  reportType: string
  reportDate?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  content: Record<string, unknown>
  projects: { projectId: string; hours: number }[]
}

export type SubmitState = { ok: true; id: string } | { ok: false; error: string } | undefined

export async function submitReport(input: ReportInput): Promise<SubmitState> {
  const me = await getCurrentEmployee()
  if (!["daily", "weekly", "monthly"].includes(input.reportType)) {
    return { ok: false, error: "잘못된 보고 유형입니다." }
  }

  const supabase = await createClient()

  if (input.reportType === "daily") {
    // 일일: 업무 목록 검증
    const raw = (input.content as { items?: unknown }).items
    const items = Array.isArray(raw)
      ? (raw as { title?: string; projectId?: string }[])
      : []
    if (items.length === 0) return { ok: false, error: "업무를 1개 이상 입력하세요." }
    for (const it of items) {
      if (!String(it.title ?? "").trim()) return { ok: false, error: "업무 내용을 입력하세요." }
      if (!it.projectId) return { ok: false, error: "각 업무에 프로젝트를 선택하세요." }
    }
  } else {
    // 주간/월간: 템플릿 필수 항목 검증
    const { data: tplRows } = await supabase
      .from("report_templates")
      .select("fields")
      .eq("report_type", input.reportType)
      .limit(1)
    const fields: TemplateField[] = tplRows?.[0]?.fields ?? []
    for (const f of fields) {
      if (!f.required) continue
      const v = input.content?.[f.key]
      const empty =
        v == null ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && v.length === 0)
      if (empty) return { ok: false, error: `‘${f.label}’ 항목은 필수입니다.` }
    }
  }

  const projects = (input.projects ?? []).filter((p) => p.projectId)
  if (projects.length === 0) {
    return { ok: false, error: "프로젝트를 선택하세요." }
  }

  const { data: ins, error } = await supabase
    .from("reports")
    .insert({
      employee_id: me.id,
      report_type: input.reportType,
      report_date: input.reportDate || null,
      period_start: input.periodStart || null,
      period_end: input.periodEnd || null,
      content: input.content ?? {},
      status: "제출",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error || !ins) return { ok: false, error: `저장 실패: ${error?.message}` }

  const links = projects.map((p) => ({
    report_id: ins.id as string,
    project_id: p.projectId,
    hours: Number(p.hours) || 0,
  }))
  const linkRes = await supabase.from("report_project_links").insert(links)
  if (linkRes.error) {
    return { ok: false, error: `프로젝트 연결 실패: ${linkRes.error.message}` }
  }

  revalidatePath("/reports")
  return { ok: true, id: ins.id as string }
}

export type CommentState = { ok: true } | { ok: false; error: string } | undefined

export async function addComment(
  reportId: string,
  content: string,
  parentId?: string
): Promise<CommentState> {
  const me = await getCurrentEmployee()
  const text = content.trim()
  if (!text) return { ok: false, error: "내용을 입력하세요." }

  const supabase = await createClient()
  const { error } = await supabase.from("report_comments").insert({
    report_id: reportId,
    author_id: me.id,
    parent_comment_id: parentId ?? null,
    content: text,
  })
  if (error) return { ok: false, error: `등록 실패: ${error.message}` }

  // 알림: 관리자 코멘트 → 작성자 / 작성자 답글 → 관리자
  const { data: rep } = await supabase
    .from("reports")
    .select("employee_id")
    .eq("id", reportId)
    .single()
  if (rep) {
    if (me.role === "admin" && rep.employee_id !== me.id) {
      await notify([rep.employee_id as string], {
        type: "보고코멘트",
        title: "내 업무보고에 코멘트가 달렸습니다",
        link: `/reports/${reportId}`,
      })
    } else if (me.id === rep.employee_id) {
      await notify(await adminIds(), {
        type: "보고답글",
        title: "업무보고에 답글이 달렸습니다",
        link: `/reports/${reportId}`,
      })
    }
  }

  revalidatePath(`/reports/${reportId}`)
  return { ok: true }
}
