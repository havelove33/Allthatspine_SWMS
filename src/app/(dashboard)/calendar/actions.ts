"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"

export type CState = { ok: true } | { ok: false; error: string } | undefined

export interface EventInput {
  title: string
  event_type: string
  start_date: string
  end_date?: string
  note?: string
}

export async function addEvent(input: EventInput): Promise<CState> {
  const me = await getCurrentEmployee()
  if (!input.title.trim()) return { ok: false, error: "제목을 입력하세요." }
  if (!input.start_date) return { ok: false, error: "날짜를 선택하세요." }
  const type = ["personal", "company", "meeting", "project"].includes(input.event_type)
    ? input.event_type
    : "personal"
  const visibility = type === "personal" ? "private" : "shared"
  const supabase = await createClient()
  const { error } = await supabase.from("calendar_events").insert({
    title: input.title.trim(),
    event_type: type,
    start_date: input.start_date,
    end_date: input.end_date || null,
    all_day: true,
    owner_id: me.id,
    visibility,
    note: input.note || null,
  })
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  revalidatePath("/calendar")
  return { ok: true }
}

export async function deleteEvent(id: string): Promise<CState> {
  await getCurrentEmployee()
  const supabase = await createClient()
  const { error } = await supabase.from("calendar_events").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/calendar")
  return { ok: true }
}
