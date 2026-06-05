"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"
import {
  getClientIp,
  isIpAllowed,
  judgeCheckIn,
  judgeCheckOut,
  calcWorkMinutes,
  getKstDateString,
} from "@/lib/attendance"
import { isValidRotatingToken } from "@/lib/kiosk"

export type CheckState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined

/** 회사 IP 검증 (개발 환경에서는 생략 — localhost는 공인 IP를 전달하지 못함). */
async function validateLocation(): Promise<{ error?: string; ip: string | null }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("company_settings")
    .select("allowed_ip_ranges")
    .eq("id", 1)
    .single()
  const ranges: string[] = data?.allowed_ip_ranges ?? []

  const h = await headers()
  const ip = getClientIp(h)

  // 허용 IP 대역이 비어 있으면 IP 검증을 사용하지 않음(어디서든 출퇴근 허용).
  // 공인 IP 확정 후 관리자 설정에서 회사 IP 대역을 입력하면 검증이 다시 켜진다.
  if (process.env.NODE_ENV === "production" && ranges.length > 0) {
    if (!ip || !isIpAllowed(ip, ranges)) {
      return { error: "회사 네트워크에서만 출퇴근이 가능합니다. (IP 불일치)", ip }
    }
  }
  return { ip }
}

/** 회전 QR 토큰 검증 (시간기반, ±1 윈도우 허용). */
function validateToken(formData: FormData): string | null {
  const token = String(formData.get("token") ?? "").trim()
  if (!token) return "QR을 스캔하거나 사무실 코드를 입력하세요."
  if (!isValidRotatingToken(token, Date.now())) {
    return "QR이 만료되었거나 올바르지 않습니다. 사무실 QR을 다시 스캔하세요."
  }
  return null
}

export async function checkIn(
  _prev: CheckState,
  formData: FormData
): Promise<CheckState> {
  const me = await getCurrentEmployee()

  const loc = await validateLocation()
  if (loc.error) return { ok: false, error: loc.error }
  const tokenErr = validateToken(formData)
  if (tokenErr) return { ok: false, error: tokenErr }

  const supabase = await createClient()
  const { data: s } = await supabase
    .from("company_settings")
    .select("work_start_time, late_grace_minutes")
    .eq("id", 1)
    .single()
  const workStart = s?.work_start_time ?? "09:00"
  const grace = s?.late_grace_minutes ?? 0

  const now = new Date()
  const workDate = getKstDateString(now)
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("attendance")
    .select("id, check_in_at")
    .eq("employee_id", me.id)
    .eq("work_date", workDate)
    .limit(1)
  if (existing?.[0]?.check_in_at) {
    return { ok: false, error: "이미 오늘 출근 처리되었습니다." }
  }

  const { isLate, status } = judgeCheckIn(now, workStart, grace)
  const row = {
    employee_id: me.id,
    work_date: workDate,
    check_in_at: now.toISOString(),
    check_in_ip: loc.ip,
    check_in_method: "ip+qr",
    status,
    is_late: isLate,
  }

  const res = existing?.[0]
    ? await admin.from("attendance").update(row).eq("id", existing[0].id)
    : await admin.from("attendance").insert(row)
  if (res.error) return { ok: false, error: `출근 처리 실패: ${res.error.message}` }

  revalidatePath("/attendance")
  return {
    ok: true,
    message: isLate ? "출근 처리되었습니다. (지각)" : "출근 처리되었습니다.",
  }
}

export async function checkOut(): Promise<CheckState> {
  const me = await getCurrentEmployee()

  const loc = await validateLocation()
  if (loc.error) return { ok: false, error: loc.error }

  const supabase = await createClient()
  const { data: s } = await supabase
    .from("company_settings")
    .select("work_end_time")
    .eq("id", 1)
    .single()
  const workEnd = s?.work_end_time ?? "18:00"

  const now = new Date()
  const workDate = getKstDateString(now)
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from("attendance")
    .select("*")
    .eq("employee_id", me.id)
    .eq("work_date", workDate)
    .limit(1)
  const att = rows?.[0]
  if (!att || !att.check_in_at) {
    return { ok: false, error: "오늘 출근 기록이 없습니다." }
  }
  if (att.check_out_at) {
    return { ok: false, error: "이미 퇴근 처리되었습니다." }
  }

  const checkInAt = new Date(att.check_in_at)
  const { isEarlyLeave } = judgeCheckOut(now, workEnd)
  const workMinutes = calcWorkMinutes(checkInAt, now)
  const status =
    att.status === "지각" ? "지각" : isEarlyLeave ? "조기퇴근" : att.status

  const { error } = await admin
    .from("attendance")
    .update({
      check_out_at: now.toISOString(),
      check_out_ip: loc.ip,
      work_minutes: workMinutes,
      is_early_leave: isEarlyLeave,
      status,
    })
    .eq("id", att.id)
  if (error) return { ok: false, error: `퇴근 처리 실패: ${error.message}` }

  revalidatePath("/attendance")
  return {
    ok: true,
    message: isEarlyLeave ? "퇴근 처리되었습니다. (조기퇴근)" : "퇴근 처리되었습니다.",
  }
}
