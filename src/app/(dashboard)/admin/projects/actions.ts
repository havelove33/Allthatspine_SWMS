"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getAdminOrThrow } from "@/lib/auth"

export type ProjectState = { ok: true } | { ok: false; error: string } | undefined

export async function createProject(
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  await getAdminOrThrow()

  const name = String(formData.get("name") ?? "").trim()
  const tag = String(formData.get("tag") ?? "").trim()
  if (!name) return { ok: false, error: "프로젝트명을 입력하세요." }
  if (!tag) return { ok: false, error: "태그를 입력하세요." }

  const admin = createAdminClient()
  const { error } = await admin
    .from("projects")
    .insert({ name, tag, status: "진행중" })
  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 사용 중인 태그입니다." }
    return { ok: false, error: `생성 실패: ${error.message}` }
  }

  revalidatePath("/admin/projects")
  return { ok: true }
}

export async function archiveProject(id: string, archived: boolean): Promise<ProjectState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin
    .from("projects")
    .update({ status: archived ? "보관" : "진행중" })
    .eq("id", id)
  if (error) return { ok: false, error: `변경 실패: ${error.message}` }
  revalidatePath("/admin/projects")
  return { ok: true }
}
