"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee, getAdminOrThrow } from "@/lib/auth"

export type FState = { ok: true } | { ok: false; error: string } | undefined

// ── 폴더 (관리자) ──
export async function createFolder(name: string, parentId?: string): Promise<FState> {
  await getAdminOrThrow()
  if (!name.trim()) return { ok: false, error: "폴더명을 입력하세요." }
  const admin = createAdminClient()
  const { error } = await admin
    .from("file_folders")
    .insert({ name: name.trim(), parent_id: parentId || null })
  if (error) return { ok: false, error: `생성 실패: ${error.message}` }
  revalidatePath("/files")
  return { ok: true }
}

export async function deleteFolder(id: string): Promise<FState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("file_folders").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/files")
  return { ok: true }
}

// ── 파일 / 외부 링크 ──
export async function createFile(formData: FormData): Promise<FState> {
  const me = await getCurrentEmployee()
  const file = formData.get("file")
  const externalUrl = (formData.get("external_url") as string)?.trim() || null
  let name = (formData.get("name") as string)?.trim() || ""
  const folderId = (formData.get("folder_id") as string) || null
  const visibility = formData.get("visibility") === "restricted" ? "restricted" : "all"
  const grantsRaw = (formData.get("grants") as string) || "[]"

  const admin = createAdminClient()
  let storagePath: string | null = null
  let mime: string | null = null
  let size: number | null = null

  if (file instanceof File && file.size > 0) {
    if (file.size > 50 * 1024 * 1024) return { ok: false, error: "50MB 이하만 업로드할 수 있습니다." }
    if (!name) name = file.name
    const safe = file.name.replace(/[^\w.\-가-힣]/g, "_").slice(-60) || "file"
    storagePath = `shared/${randomBytes(8).toString("hex")}-${safe}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await admin.storage
      .from("files")
      .upload(storagePath, buf, { contentType: file.type || "application/octet-stream", upsert: false })
    if (upErr) return { ok: false, error: `업로드 실패: ${upErr.message}` }
    mime = file.type || null
    size = file.size
  } else if (!externalUrl) {
    return { ok: false, error: "파일 또는 외부 링크가 필요합니다." }
  }
  if (!name) name = externalUrl ?? "파일"

  const { data: inserted, error } = await admin
    .from("shared_files")
    .insert({
      folder_id: folderId,
      name,
      storage_path: storagePath,
      external_url: externalUrl,
      mime_type: mime,
      size_bytes: size,
      visibility,
      uploaded_by: me.id,
    })
    .select("id")
    .single()
  if (error || !inserted) return { ok: false, error: `저장 실패: ${error?.message}` }

  if (visibility === "restricted") {
    let ids: string[] = []
    try {
      ids = JSON.parse(grantsRaw)
    } catch {
      ids = []
    }
    if (ids.length > 0) {
      await admin
        .from("file_grants")
        .insert(ids.map((eid) => ({ file_id: inserted.id as string, employee_id: eid })))
    }
  }
  revalidatePath("/files")
  return { ok: true }
}

export async function deleteFile(id: string): Promise<FState> {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  const { data: f } = await supabase
    .from("shared_files")
    .select("uploaded_by, storage_path")
    .eq("id", id)
    .maybeSingle()
  if (!f) return { ok: false, error: "파일을 찾을 수 없습니다." }
  if (f.uploaded_by !== me.id && me.role !== "admin")
    return { ok: false, error: "삭제 권한이 없습니다." }

  const admin = createAdminClient()
  if (f.storage_path) await admin.storage.from("files").remove([f.storage_path as string])
  await admin.from("shared_files").delete().eq("id", id)
  revalidatePath("/files")
  return { ok: true }
}
