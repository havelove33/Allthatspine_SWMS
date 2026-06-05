"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee, getAdminOrThrow } from "@/lib/auth"
import { notify, adminIds } from "@/lib/notify"

export type AState = { ok: true; id: string } | { ok: false; error: string } | undefined
export type ASimple = { ok: true } | { ok: false; error: string } | undefined

const FORM_TYPES = ["leave", "expense", "purchase", "general"]
const FORM_LABEL: Record<string, string> = {
  leave: "휴가 신청",
  expense: "지출 결의",
  purchase: "구매 요청",
  general: "일반 기안",
}

export interface ApprovalInput {
  form_type: string
  title: string
  content: Record<string, unknown>
}

export async function createApproval(input: ApprovalInput): Promise<AState> {
  const me = await getCurrentEmployee()
  const formType = FORM_TYPES.includes(input.form_type) ? input.form_type : "general"
  const title = input.title.trim() || FORM_LABEL[formType]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("approvals")
    .insert({
      form_type: formType,
      title,
      content: input.content ?? {},
      applicant_id: me.id,
      status: "대기",
    })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: `상신 실패: ${error?.message}` }

  await notify(await adminIds(), {
    type: "approval",
    title: "결재 요청",
    message: `${me.name}님의 ${FORM_LABEL[formType]}`,
    link: `/approvals/${data.id}`,
  })
  revalidatePath("/approvals")
  return { ok: true, id: data.id as string }
}

export async function decideApproval(
  id: string,
  decision: "승인" | "반려",
  reason?: string
): Promise<ASimple> {
  const me = await getAdminOrThrow()
  if (decision === "반려" && !reason?.trim())
    return { ok: false, error: "반려 사유를 입력하세요." }

  const admin = createAdminClient()
  const { data: ap } = await admin.from("approvals").select("*").eq("id", id).single()
  if (!ap) return { ok: false, error: "문서를 찾을 수 없습니다." }
  if (ap.status !== "대기") return { ok: false, error: "이미 처리된 문서입니다." }

  let linkedLeaveId: string | null = null
  // 휴가 결재 승인 → 근태(leaves) 자동 반영
  if (decision === "승인" && ap.form_type === "leave") {
    const c = (ap.content ?? {}) as Record<string, unknown>
    const start = String(c.start_date ?? "")
    const end = String(c.end_date ?? start)
    if (start) {
      const { data: lv } = await admin
        .from("leaves")
        .insert({
          employee_id: ap.applicant_id,
          leave_type: String(c.leave_type ?? "연차"),
          start_date: start,
          end_date: end || start,
          days: Number(c.days ?? 1) || 1,
          reason: c.reason ? String(c.reason) : null,
          status: "승인",
          approved_by: me.id,
        })
        .select("id")
        .single()
      linkedLeaveId = (lv?.id as string) ?? null
    }
  }

  const { error } = await admin
    .from("approvals")
    .update({
      status: decision,
      reject_reason: decision === "반려" ? reason!.trim() : null,
      decided_by: me.id,
      decided_at: new Date().toISOString(),
      linked_leave_id: linkedLeaveId,
    })
    .eq("id", id)
  if (error) return { ok: false, error: `처리 실패: ${error.message}` }

  await notify([ap.applicant_id as string], {
    type: "approval",
    title: `결재 ${decision}`,
    message: `‘${ap.title}’ 문서가 ${decision}되었습니다.`,
    link: `/approvals/${id}`,
  })
  revalidatePath("/approvals")
  revalidatePath(`/approvals/${id}`)
  return { ok: true }
}

export async function withdrawApproval(id: string): Promise<ASimple> {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  const { data: ap } = await supabase
    .from("approvals")
    .select("applicant_id, status")
    .eq("id", id)
    .single()
  if (!ap) return { ok: false, error: "문서를 찾을 수 없습니다." }
  if (ap.applicant_id !== me.id) return { ok: false, error: "본인 문서만 회수할 수 있습니다." }
  if (ap.status !== "대기") return { ok: false, error: "대기 중인 문서만 회수할 수 있습니다." }
  const { error } = await supabase.from("approvals").update({ status: "회수" }).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/approvals")
  revalidatePath(`/approvals/${id}`)
  return { ok: true }
}

export async function addApprovalComment(id: string, content: string): Promise<ASimple> {
  const me = await getCurrentEmployee()
  if (!content.trim()) return { ok: false, error: "내용을 입력하세요." }
  const supabase = await createClient()
  const { error } = await supabase
    .from("approval_comments")
    .insert({ approval_id: id, author_id: me.id, content: content.trim() })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/approvals/${id}`)
  return { ok: true }
}
