"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"
import type { AppNotification } from "@/types"

export async function getMyNotifications(): Promise<{
  items: AppNotification[]
  unread: number
}> {
  const me = await getCurrentEmployee()
  const supabase = await createClient()

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", me.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", me.id)
    .eq("is_read", false)

  return { items: (data ?? []) as AppNotification[], unread: count ?? 0 }
}

export async function markNotificationRead(id: string) {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", me.id)
}

export async function markAllNotificationsRead() {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", me.id)
    .eq("is_read", false)
}
