"use server"

import { randomBytes } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"

export type UploadResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string }

/** 파일을 uploads 버킷에 업로드하고 공개 URL을 반환 (에디터 이미지/파일용). */
export async function uploadFile(formData: FormData): Promise<UploadResult> {
  await getCurrentEmployee()
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, error: "파일이 없습니다." }
  if (file.size === 0) return { ok: false, error: "빈 파일입니다." }
  if (file.size > 10 * 1024 * 1024)
    return { ok: false, error: "10MB 이하만 업로드할 수 있습니다." }

  const admin = createAdminClient()
  const safe = file.name.replace(/[^\w.\-가-힣]/g, "_").slice(-60) || "file"
  const path = `posts/${randomBytes(8).toString("hex")}-${safe}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage
    .from("uploads")
    .upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
  if (error) return { ok: false, error: `업로드 실패: ${error.message}` }

  const { data } = admin.storage.from("uploads").getPublicUrl(path)
  return { ok: true, url: data.publicUrl, name: file.name }
}
