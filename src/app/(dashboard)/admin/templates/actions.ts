"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getAdminOrThrow } from "@/lib/auth"
import type { TemplateField } from "@/types"

export type TplState = { ok: true } | { ok: false; error: string } | undefined

const TYPES = ["daily", "weekly", "monthly"]
const FIELD_TYPES = ["text", "textarea", "number", "select", "multiselect"]

export async function saveTemplate(
  reportType: string,
  fields: TemplateField[]
): Promise<TplState> {
  await getAdminOrThrow()
  if (!TYPES.includes(reportType)) return { ok: false, error: "잘못된 보고 유형입니다." }

  const clean: TemplateField[] = (fields ?? [])
    .map((f) => {
      const type = FIELD_TYPES.includes(f.type) ? f.type : "text"
      const needsOptions = type === "select" || type === "multiselect"
      const options = needsOptions
        ? (f.options ?? []).map((o) => String(o).trim()).filter(Boolean)
        : undefined
      return {
        key: f.key && String(f.key).trim() ? f.key : "f_" + randomBytes(3).toString("hex"),
        label: String(f.label ?? "").trim(),
        type,
        required: !!f.required,
        ...(options && options.length ? { options } : {}),
      } as TemplateField
    })
    .filter((f) => f.label)

  if (clean.length === 0) return { ok: false, error: "필드를 1개 이상 추가하세요." }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("report_templates")
    .select("id")
    .eq("report_type", reportType)
    .limit(1)

  const res = existing?.[0]
    ? await admin
        .from("report_templates")
        .update({ fields: clean, updated_at: new Date().toISOString() })
        .eq("id", existing[0].id)
    : await admin.from("report_templates").insert({ report_type: reportType, fields: clean })

  if (res.error) return { ok: false, error: `저장 실패: ${res.error.message}` }

  revalidatePath("/admin/templates")
  return { ok: true }
}
