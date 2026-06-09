"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee, getAdminOrThrow } from "@/lib/auth"
import { leaveTypeDef, computeLeaveDays } from "@/lib/leave"
import { notify, adminIds } from "@/lib/notify"

export type LeaveState = { ok: true } | { ok: false; error: string } | undefined

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function requestLeave(
  _prev: LeaveState,
  formData: FormData
): Promise<LeaveState> {
  const me = await getCurrentEmployee()

  const type = String(formData.get("leave_type") ?? "")
  const start = String(formData.get("start_date") ?? "")
  let end = String(formData.get("end_date") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()

  const def = leaveTypeDef(type)
  if (!def) return { ok: false, error: "휴가 종류를 선택하세요." }
  if (!DATE_RE.test(start)) return { ok: false, error: "시작일을 선택하세요." }
  if (def.half || def.quarter) end = start // 반차·반반차는 당일
  if (!DATE_RE.test(end)) end = start
  if (end < start) return { ok: false, error: "종료일이 시작일보다 빠릅니다." }

  const days = computeLeaveDays(type, start, end)
  if (days <= 0) return { ok: false, error: "휴가 일수가 0일입니다. (주말만 선택했는지 확인)" }

  const supabase = await createClient()
  const { error } = await supabase.from("leaves").insert({
    employee_id: me.id,
    leave_type: type,
    start_date: start,
    end_date: end,
    days,
    reason: reason || null,
    status: "대기",
  })
  if (error) return { ok: false, error: `신청 실패: ${error.message}` }

  await notify(await adminIds(), {
    type: "휴가신청",
    title: `휴가 신청 — ${me.name}`,
    message: `${type} ${start}${end !== start ? ` ~ ${end}` : ""} (${days}일)`,
    link: "/attendance/leave",
  })

  revalidatePath("/attendance/leave")
  return { ok: true }
}

export async function approveLeave(leaveId: string): Promise<LeaveState> {
  const admin_user = await getAdminOrThrow()
  const admin = createAdminClient()

  const { data: leave } = await admin
    .from("leaves")
    .select("*")
    .eq("id", leaveId)
    .single()
  if (!leave) return { ok: false, error: "신청을 찾을 수 없습니다." }
  if (leave.status === "승인") return { ok: false, error: "이미 승인되었습니다." }

  const { error } = await admin
    .from("leaves")
    .update({ status: "승인", approved_by: admin_user.id })
    .eq("id", leaveId)
  if (error) return { ok: false, error: `승인 실패: ${error.message}` }

  // 소비성 휴가(연차/반차/반반차)면 사용 연차에 자동 가산
  if (leaveTypeDef(leave.leave_type)?.consumes) {
    const { data: emp } = await admin
      .from("employees")
      .select("annual_leave_used")
      .eq("id", leave.employee_id)
      .single()
    const used = (Number(emp?.annual_leave_used) || 0) + Number(leave.days)
    await admin.from("employees").update({ annual_leave_used: used }).eq("id", leave.employee_id)
  }

  await notify([leave.employee_id], {
    type: "휴가승인",
    title: "휴가가 승인되었습니다",
    message: `${leave.leave_type} ${leave.start_date}${leave.end_date !== leave.start_date ? ` ~ ${leave.end_date}` : ""}`,
    link: "/attendance/leave",
  })

  revalidatePath("/attendance/leave")
  revalidatePath("/attendance")
  return { ok: true }
}

export async function rejectLeave(leaveId: string): Promise<LeaveState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { data: leave } = await admin
    .from("leaves")
    .select("employee_id, leave_type, start_date")
    .eq("id", leaveId)
    .single()
  const { error } = await admin
    .from("leaves")
    .update({ status: "반려" })
    .eq("id", leaveId)
  if (error) return { ok: false, error: `반려 실패: ${error.message}` }

  if (leave?.employee_id) {
    await notify([leave.employee_id], {
      type: "휴가반려",
      title: "휴가가 반려되었습니다",
      message: `${leave.leave_type} ${leave.start_date}`,
      link: "/attendance/leave",
    })
  }
  revalidatePath("/attendance/leave")
  return { ok: true }
}
