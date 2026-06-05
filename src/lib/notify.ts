import { createAdminClient } from "@/lib/supabase/server"

// 알림 생성은 RLS상 서비스롤로 수행 (직원 액션에서 관리자에게도 보낼 수 있어야 함).

interface NotifyInput {
  type: string
  title: string
  message?: string
  link?: string
}

export async function notify(recipientIds: string[], n: NotifyInput) {
  const ids = recipientIds.filter(Boolean)
  if (ids.length === 0) return
  const admin = createAdminClient()
  await admin.from("notifications").insert(
    ids.map((id) => ({
      recipient_id: id,
      type: n.type,
      title: n.title,
      message: n.message ?? null,
      link: n.link ?? null,
    }))
  )
}

/** 모든 관리자 id. */
export async function adminIds(): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin.from("employees").select("id").eq("role", "admin")
  return (data ?? []).map((e) => e.id as string)
}
