"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee, getAdminOrThrow } from "@/lib/auth"
import { judgeCheckIn, judgeCheckOut, calcWorkMinutes } from "@/lib/attendance"
import { notify, adminIds } from "@/lib/notify"

export type CorrState = { ok: true } | { ok: false; error: string } | undefined

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export async function requestCorrection(
  _prev: CorrState,
  formData: FormData
): Promise<CorrState> {
  const me = await getCurrentEmployee()

  const workDate = String(formData.get("work_date") ?? "")
  const requestType = String(formData.get("request_type") ?? "")
  const time = String(formData.get("time") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()

  if (!DATE_RE.test(workDate)) return { ok: false, error: "날짜를 선택하세요." }
  if (requestType !== "출근" && requestType !== "퇴근")
    return { ok: false, error: "정정 구분을 선택하세요." }
  if (!TIME_RE.test(time)) return { ok: false, error: "시각을 입력하세요." }
  if (!reason) return { ok: false, error: "사유를 입력하세요." }

  // KST 벽시계 → ISO(UTC)
  const requestedTime = new Date(`${workDate}T${time}:00+09:00`).toISOString()

  const supabase = await createClient()
  const { error } = await supabase.from("attendance_corrections").insert({
    employee_id: me.id,
    work_date: workDate,
    request_type: requestType,
    requested_time: requestedTime,
    reason,
    status: "대기",
  })
  if (error) return { ok: false, error: `요청 실패: ${error.message}` }

  await notify(await adminIds(), {
    type: "정정요청",
    title: `출퇴근 정정 요청 — ${me.name}`,
    message: `${workDate} ${requestType} 시각 정정`,
    link: "/attendance/corrections",
  })

  revalidatePath("/attendance/corrections")
  return { ok: true }
}

export async function approveCorrection(id: string): Promise<CorrState> {
  const me = await getAdminOrThrow()
  const admin = createAdminClient()

  const { data: corr } = await admin
    .from("attendance_corrections")
    .select("*")
    .eq("id", id)
    .single()
  if (!corr) return { ok: false, error: "요청을 찾을 수 없습니다." }
  if (corr.status === "승인") return { ok: false, error: "이미 처리되었습니다." }
  if (!corr.requested_time) return { ok: false, error: "정정 시각이 없습니다." }

  const supabase = await createClient()
  const { data: s } = await supabase
    .from("company_settings")
    .select("work_start_time, work_end_time, late_grace_minutes")
    .eq("id", 1)
    .single()
  const ws = s?.work_start_time ?? "09:00"
  const we = s?.work_end_time ?? "18:00"
  const grace = s?.late_grace_minutes ?? 0

  const { data: rows } = await admin
    .from("attendance")
    .select("*")
    .eq("employee_id", corr.employee_id)
    .eq("work_date", corr.work_date)
    .limit(1)
  const att = rows?.[0]

  let checkIn = att?.check_in_at ? new Date(att.check_in_at) : null
  let checkOut = att?.check_out_at ? new Date(att.check_out_at) : null
  const reqTime = new Date(corr.requested_time)
  if (corr.request_type === "출근") checkIn = reqTime
  else checkOut = reqTime

  const isLate = checkIn ? judgeCheckIn(checkIn, ws, grace).isLate : false
  const isEarly = checkOut ? judgeCheckOut(checkOut, we).isEarlyLeave : false
  const workMinutes = checkIn && checkOut ? calcWorkMinutes(checkIn, checkOut) : null
  const status = isLate ? "지각" : isEarly ? "조기퇴근" : "정상"

  const payload = {
    employee_id: corr.employee_id,
    work_date: corr.work_date,
    check_in_at: checkIn?.toISOString() ?? null,
    check_out_at: checkOut?.toISOString() ?? null,
    is_late: isLate,
    is_early_leave: isEarly,
    work_minutes: workMinutes,
    status,
    note: "정정 승인",
  }
  const res = att
    ? await admin.from("attendance").update(payload).eq("id", att.id)
    : await admin.from("attendance").insert(payload)
  if (res.error) return { ok: false, error: `반영 실패: ${res.error.message}` }

  await admin
    .from("attendance_corrections")
    .update({ status: "승인", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)

  await notify([corr.employee_id], {
    type: "정정승인",
    title: "출퇴근 정정이 승인되었습니다",
    message: `${corr.work_date} ${corr.request_type} 시각`,
    link: "/attendance/corrections",
  })

  revalidatePath("/attendance/corrections")
  revalidatePath("/attendance")
  return { ok: true }
}

export async function rejectCorrection(id: string): Promise<CorrState> {
  const me = await getAdminOrThrow()
  const admin = createAdminClient()
  const { data: corr } = await admin
    .from("attendance_corrections")
    .select("employee_id, work_date, request_type")
    .eq("id", id)
    .single()
  const { error } = await admin
    .from("attendance_corrections")
    .update({ status: "반려", reviewed_by: me.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, error: `반려 실패: ${error.message}` }

  if (corr?.employee_id) {
    await notify([corr.employee_id], {
      type: "정정반려",
      title: "출퇴근 정정이 반려되었습니다",
      message: `${corr.work_date} ${corr.request_type} 시각`,
      link: "/attendance/corrections",
    })
  }
  revalidatePath("/attendance/corrections")
  return { ok: true }
}
