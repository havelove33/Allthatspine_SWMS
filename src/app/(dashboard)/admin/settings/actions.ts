"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getAdminOrThrow } from "@/lib/auth"
import { ipv4ToLong } from "@/lib/attendance"

export type SettingsState = { ok: true } | { ok: false; error: string } | undefined

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/

function parseRanges(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function validCidr(cidr: string): boolean {
  const [ip, bits] = cidr.split("/")
  if (ipv4ToLong(ip ?? "") === null) return false
  if (bits === undefined) return true
  const b = Number(bits)
  return Number.isInteger(b) && b >= 0 && b <= 32
}

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await getAdminOrThrow()

  const workStart = String(formData.get("work_start_time") ?? "")
  const workEnd = String(formData.get("work_end_time") ?? "")
  const reportDeadline = String(formData.get("report_deadline_time") ?? "")
  const graceRaw = String(formData.get("late_grace_minutes") ?? "0")
  const rangesRaw = String(formData.get("allowed_ip_ranges") ?? "")

  if (!TIME_RE.test(workStart) || !TIME_RE.test(workEnd)) {
    return { ok: false, error: "근무 시작/종료 시간 형식이 올바르지 않습니다." }
  }
  if (reportDeadline && !TIME_RE.test(reportDeadline)) {
    return { ok: false, error: "보고 마감 시간 형식이 올바르지 않습니다." }
  }
  const grace = Number(graceRaw)
  if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
    return { ok: false, error: "지각 유예(분)는 0~120 사이여야 합니다." }
  }
  const ranges = parseRanges(rangesRaw)
  for (const c of ranges) {
    if (!validCidr(c)) return { ok: false, error: `잘못된 IP 형식: ${c}` }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("company_settings")
    .update({
      work_start_time: workStart,
      work_end_time: workEnd,
      report_deadline_time: reportDeadline || "18:00",
      late_grace_minutes: grace,
      allowed_ip_ranges: ranges,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)

  if (error) return { ok: false, error: `저장 실패: ${error.message}` }

  revalidatePath("/admin/settings")
  revalidatePath("/attendance")
  return { ok: true }
}

/** 회사 직인 이미지 URL 저장(전자결재 날인용). */
export async function saveSealImage(url: string | null): Promise<SettingsState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin
    .from("company_settings")
    .update({ seal_image_url: url, updated_at: new Date().toISOString() })
    .eq("id", 1)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  revalidatePath("/admin/settings")
  return { ok: true }
}

/** 현재 관리자 본인의 결재 서명 이미지 URL 저장. */
export async function saveMySignature(url: string | null): Promise<SettingsState> {
  const me = await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin
    .from("employees")
    .update({ signature_image_url: url })
    .eq("id", me.id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  revalidatePath("/admin/settings")
  return { ok: true }
}
