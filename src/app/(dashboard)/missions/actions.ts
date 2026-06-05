"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee, getAdminOrThrow } from "@/lib/auth"
import { notify, adminIds } from "@/lib/notify"

export type MissionState = { ok: true } | { ok: false; error: string } | undefined
export type CreateMissionState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | undefined

export interface MissionInput {
  employeeId?: string
  projectId: string
  periodType: string
  periodStart: string
  periodEnd: string
  title: string
  targetMetric: string
  achievementCriteria: string
  priority: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function createMission(input: MissionInput): Promise<CreateMissionState> {
  const me = await getCurrentEmployee()

  if (!["daily", "weekly", "monthly", "ongoing"].includes(input.periodType))
    return { ok: false, error: "기간 유형을 선택하세요." }
  if (!input.title?.trim()) return { ok: false, error: "제목을 입력하세요." }
  if (!input.targetMetric?.trim())
    return { ok: false, error: "측정 가능한 목표를 입력하세요." }
  if (!input.projectId) return { ok: false, error: "연관 프로젝트를 선택하세요." }
  const isOngoing = input.periodType === "ongoing"
  if (!DATE_RE.test(input.periodStart))
    return { ok: false, error: "시작일을 선택하세요." }
  if (!isOngoing && !DATE_RE.test(input.periodEnd))
    return { ok: false, error: "종료일을 선택하세요." }

  const isAdmin = me.role === "admin"
  const employeeId = isAdmin && input.employeeId ? input.employeeId : me.id
  // 관리자가 만들면 바로 진행, 직원이 만들면 승인 대기(작성)
  const status = isAdmin ? "진행" : "작성"

  const supabase = await createClient()
  const { data: ins, error } = await supabase
    .from("missions")
    .insert({
      employee_id: employeeId,
      project_id: input.projectId,
      period_type: input.periodType,
      period_start: input.periodStart,
      period_end: isOngoing ? null : input.periodEnd,
      title: input.title.trim(),
      target_metric: input.targetMetric.trim(),
      achievement_criteria: input.achievementCriteria?.trim() || null,
      priority: ["상", "중", "하"].includes(input.priority) ? input.priority : "중",
      status,
      created_by: me.id,
      approved_by: status === "진행" ? me.id : null,
    })
    .select("id")
    .single()
  if (error || !ins) return { ok: false, error: `저장 실패: ${error?.message}` }

  if (!isAdmin) {
    await notify(await adminIds(), {
      type: "업무승인요청",
      title: `나의 업무 승인 요청 — ${me.name}`,
      message: input.title.trim(),
      link: "/missions",
    })
  } else if (employeeId !== me.id) {
    await notify([employeeId], {
      type: "업무지시",
      title: "새 업무가 지정되었습니다",
      message: input.title.trim(),
      link: "/missions",
    })
  }

  revalidatePath("/missions")
  return { ok: true, id: ins.id as string }
}

export async function approveMission(id: string): Promise<MissionState> {
  const me = await getAdminOrThrow()
  const admin = createAdminClient()
  const { data: m } = await admin.from("missions").select("employee_id, title, status").eq("id", id).single()
  if (!m) return { ok: false, error: "찾을 수 없습니다." }

  const { error } = await admin
    .from("missions")
    .update({ status: "진행", approved_by: me.id })
    .eq("id", id)
  if (error) return { ok: false, error: `승인 실패: ${error.message}` }

  await notify([m.employee_id as string], {
    type: "업무승인",
    title: "나의 업무가 승인되었습니다",
    message: m.title as string,
    link: "/missions",
  })
  revalidatePath("/missions")
  revalidatePath(`/missions/${id}`)
  return { ok: true }
}

export async function updateMissionProgress(
  id: string,
  progress: number,
  selfEval?: string
): Promise<MissionState> {
  await getCurrentEmployee()
  const p = Math.max(0, Math.min(100, Math.round(progress)))
  const supabase = await createClient()
  const patch: Record<string, unknown> = { progress: p }
  if (selfEval !== undefined) patch.self_evaluation = selfEval.trim() || null
  const { error } = await supabase.from("missions").update(patch).eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  revalidatePath(`/missions/${id}`)
  revalidatePath("/missions")
  return { ok: true }
}

export async function completeMission(id: string): Promise<MissionState> {
  await getCurrentEmployee()
  const supabase = await createClient()
  const { error } = await supabase.from("missions").update({ status: "완료" }).eq("id", id)
  if (error) return { ok: false, error: `처리 실패: ${error.message}` }
  revalidatePath(`/missions/${id}`)
  revalidatePath("/missions")
  return { ok: true }
}

export async function saveManagerReview(
  id: string,
  managerEval: string,
  result: string
): Promise<MissionState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { data: m } = await admin.from("missions").select("employee_id").eq("id", id).single()
  const { error } = await admin
    .from("missions")
    .update({
      manager_evaluation: managerEval.trim() || null,
      result: ["달성", "미달", "초과"].includes(result) ? result : null,
    })
    .eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  if (m?.employee_id) {
    await notify([m.employee_id as string], {
      type: "업무평가",
      title: "나의 업무에 관리자 평가가 등록되었습니다",
      link: `/missions/${id}`,
    })
  }
  revalidatePath(`/missions/${id}`)
  return { ok: true }
}
