"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getAdminOrThrow } from "@/lib/auth"
import { performBackup, performRestore, buildSnapshot, type RestoreReport } from "@/lib/backup"

export type BackupState =
  | { ok: true; filename: string; totalRows: number }
  | { ok: false; error: string }
  | undefined

export type SimpleState = { ok: true } | { ok: false; error: string } | undefined

/** 로그인 시 자동 백업용 — 스냅샷을 만들어 JSON을 그대로 반환(로컬 다운로드용, Storage 미저장). */
export async function loginSnapshot(): Promise<
  { ok: true; json: string; filename: string; totalRows: number } | { ok: false; error: string }
> {
  await getAdminOrThrow()
  try {
    const snap = await buildSnapshot()
    return { ok: true, json: snap.json, filename: snap.filename, totalRows: snap.totalRows }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "백업 실패" }
  }
}

export async function createBackupAction(): Promise<BackupState> {
  const me = await getAdminOrThrow()
  try {
    const res = await performBackup("manual", me.id)
    revalidatePath("/admin/backup")
    return { ok: true, filename: res.filename, totalRows: res.totalRows }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "백업 실패" }
  }
}

export async function getBackupUrl(
  id: string
): Promise<{ ok: true; url: string; filename: string } | { ok: false; error: string }> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { data: row } = await admin
    .from("db_backups")
    .select("storage_path, filename")
    .eq("id", id)
    .maybeSingle()
  if (!row) return { ok: false, error: "백업을 찾을 수 없습니다." }
  const { data, error } = await admin.storage
    .from("backups")
    .createSignedUrl(row.storage_path as string, 3600, { download: row.filename as string })
  if (error || !data) return { ok: false, error: `다운로드 링크 생성 실패: ${error?.message}` }
  return { ok: true, url: data.signedUrl, filename: row.filename as string }
}

export async function deleteBackupAction(id: string): Promise<SimpleState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { data: row } = await admin
    .from("db_backups")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle()
  if (row?.storage_path) await admin.storage.from("backups").remove([row.storage_path as string])
  const { error } = await admin.from("db_backups").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/backup")
  return { ok: true }
}

/** 외부 백업 파일(.json)을 업로드하고 storage_path 반환 (복원 입력용). */
export async function uploadRestoreFile(
  formData: FormData
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  await getAdminOrThrow()
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, error: "파일이 없습니다." }
  if (file.size === 0) return { ok: false, error: "빈 파일입니다." }
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: "50MB 이하만 가능합니다." }
  const text = await file.text()
  try {
    JSON.parse(text)
  } catch {
    return { ok: false, error: "올바른 JSON 백업 파일이 아닙니다." }
  }
  const admin = createAdminClient()
  const path = `restore-uploads/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_").slice(-50)}`
  const { error } = await admin.storage
    .from("backups")
    .upload(path, Buffer.from(text, "utf8"), { contentType: "application/json", upsert: true })
  if (error) return { ok: false, error: `업로드 실패: ${error.message}` }
  return { ok: true, path }
}

export async function restoreAction(
  storagePath: string,
  confirm: string
): Promise<{ ok: true; report: RestoreReport } | { ok: false; error: string }> {
  await getAdminOrThrow()
  if (confirm !== "복원") return { ok: false, error: "확인 문구가 일치하지 않습니다." }
  try {
    const report = await performRestore(storagePath)
    revalidatePath("/admin/backup")
    return { ok: true, report }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "복원 실패" }
  }
}
