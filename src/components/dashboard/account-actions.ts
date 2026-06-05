"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"

export type ChangePwState = { ok: true } | { ok: false; error: string } | undefined

/** 로그인한 본인이 자신의 비밀번호를 변경. (본인 세션으로 수행) */
export async function changeMyPassword(
  _prev: ChangePwState,
  formData: FormData
): Promise<ChangePwState> {
  const me = await getCurrentEmployee() // 미인증이면 /login 으로 리다이렉트

  const next = String(formData.get("new_password") ?? "")
  const confirm = String(formData.get("confirm_password") ?? "")

  if (next.length < 8) {
    return { ok: false, error: "비밀번호는 8자 이상이어야 합니다." }
  }
  if (next !== confirm) {
    return { ok: false, error: "새 비밀번호가 일치하지 않습니다." }
  }

  // 본인 세션으로 비밀번호 변경 (현재 로그인 유지됨)
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) {
    const samePw = error.message.toLowerCase().includes("should be different")
    return {
      ok: false,
      error: samePw ? "기존과 다른 비밀번호를 입력하세요." : `변경 실패: ${error.message}`,
    }
  }

  // 최초 비밀번호 변경 플래그 해제 (RLS 우회 위해 admin)
  const admin = createAdminClient()
  await admin.from("employees").update({ must_change_password: false }).eq("id", me.id)

  revalidatePath("/")
  return { ok: true }
}
