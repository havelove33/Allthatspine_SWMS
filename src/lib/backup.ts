import { createAdminClient } from "@/lib/supabase/server"

/**
 * DB 백업/복원 핵심 로직 (서버 전용 — service_role 사용).
 * 백업 = 전 public 테이블 + auth 계정 목록을 JSON 스냅샷으로.
 * 복원 = 의존성 순서대로 upsert(merge). 자기참조 테이블은 2-pass.
 */

export type BackupTable = { name: string; conflict: string; selfRef?: string }
type Admin = ReturnType<typeof createAdminClient>

// 부모 → 자식 순서 (FK 만족). 자기참조(selfRef)는 2-pass 처리.
export const BACKUP_TABLES: BackupTable[] = [
  { name: "employees", conflict: "id" },
  { name: "company_settings", conflict: "id" },
  { name: "qr_tokens", conflict: "id" },
  { name: "report_templates", conflict: "id" },
  { name: "budget_accounts", conflict: "id" },
  { name: "budget_sales_targets", conflict: "id" },
  { name: "file_folders", conflict: "id", selfRef: "parent_id" },
  { name: "projects", conflict: "id", selfRef: "parent_project_id" },
  { name: "leaves", conflict: "id" },
  { name: "attendance", conflict: "id" },
  { name: "attendance_corrections", conflict: "id" },
  { name: "reports", conflict: "id" },
  { name: "missions", conflict: "id" },
  { name: "project_posts", conflict: "id" },
  { name: "project_milestones", conflict: "id" },
  { name: "budget_transactions", conflict: "id" },
  { name: "notifications", conflict: "id" },
  { name: "board_posts", conflict: "id" },
  { name: "shared_files", conflict: "id" },
  { name: "calendar_events", conflict: "id" },
  { name: "project_tasks", conflict: "id" },
  { name: "report_project_links", conflict: "id" },
  { name: "report_comments", conflict: "id", selfRef: "parent_comment_id" },
  { name: "report_missions", conflict: "report_id,mission_id" },
  { name: "board_comments", conflict: "id", selfRef: "parent_comment_id" },
  { name: "board_reads", conflict: "post_id,employee_id" },
  { name: "board_reactions", conflict: "post_id,employee_id,emoji" },
  { name: "board_popup_dismissals", conflict: "post_id,employee_id" },
  { name: "file_grants", conflict: "file_id,employee_id" },
  { name: "approvals", conflict: "id" },
  { name: "approval_comments", conflict: "id" },
]

const KEEP_BACKUPS = 30

export interface BackupResult {
  filename: string
  path: string
  totalRows: number
  sizeBytes: number
  tableCounts: Record<string, number>
}

export interface Snapshot {
  json: string
  filename: string
  totalRows: number
  tableCounts: Record<string, number>
}

/** 전 테이블 + auth 계정 목록을 JSON 스냅샷으로 (업로드/기록 없이 메모리에서만). */
export async function buildSnapshot(): Promise<Snapshot> {
  const admin = createAdminClient()
  const tables: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}
  let total = 0

  for (const t of BACKUP_TABLES) {
    const { data, error } = await admin.from(t.name).select("*")
    if (error) throw new Error(`백업 실패 (${t.name}): ${error.message}`)
    const rows = data ?? []
    tables[t.name] = rows
    counts[t.name] = rows.length
    total += rows.length
  }

  // auth 계정 목록 (참고/대조용 — 복원 시 자동 재생성하지 않음)
  const authUsers: { id: string; email: string | null }[] = []
  try {
    let page = 1
    for (;;) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const list = data?.users ?? []
      for (const u of list) authUsers.push({ id: u.id, email: u.email ?? null })
      if (list.length < 1000) break
      page++
    }
  } catch {
    // auth 목록 실패해도 데이터 백업은 진행
  }

  const now = new Date()
  const payload = {
    meta: { version: 1, app: "allthatspine-wms", created_at: now.toISOString(), total_rows: total },
    auth_users: authUsers,
    tables,
  }
  const json = JSON.stringify(payload)
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
  return { json, filename: `backup-${stamp}.json`, totalRows: total, tableCounts: counts }
}

export async function performBackup(
  kind: "manual" | "auto",
  createdBy: string | null
): Promise<BackupResult> {
  const admin = createAdminClient()
  const snap = await buildSnapshot()
  const path = `${kind}/${snap.filename}`

  const { error: upErr } = await admin.storage
    .from("backups")
    .upload(path, Buffer.from(snap.json, "utf8"), { contentType: "application/json", upsert: true })
  if (upErr) throw new Error(`백업 업로드 실패: ${upErr.message}`)

  await admin.from("db_backups").insert({
    filename: snap.filename,
    storage_path: path,
    size_bytes: snap.json.length,
    table_counts: snap.tableCounts,
    total_rows: snap.totalRows,
    kind,
    created_by: createdBy,
  })

  // 오래된 백업 정리 (최근 KEEP_BACKUPS개만 유지)
  try {
    const { data: old } = await admin
      .from("db_backups")
      .select("id, storage_path")
      .order("created_at", { ascending: false })
      .range(KEEP_BACKUPS, KEEP_BACKUPS + 500)
    if (old && old.length) {
      await admin.storage.from("backups").remove(old.map((o) => o.storage_path as string))
      await admin.from("db_backups").delete().in(
        "id",
        old.map((o) => o.id as string)
      )
    }
  } catch {
    // 정리 실패는 무시
  }

  return {
    filename: snap.filename,
    path,
    totalRows: snap.totalRows,
    sizeBytes: snap.json.length,
    tableCounts: snap.tableCounts,
  }
}

export interface RestoreReport {
  ok: boolean
  totalRestored: number
  tables: { name: string; restored: number; failed: number; error?: string }[]
  note: string
}

async function chunkUpsert(
  admin: Admin,
  name: string,
  rows: Record<string, unknown>[],
  conflict: string
): Promise<{ restored: number; failed: number; error?: string }> {
  let restored = 0
  let failed = 0
  let firstErr: string | undefined
  const CH = 500
  for (let i = 0; i < rows.length; i += CH) {
    const chunk = rows.slice(i, i + CH)
    const { error } = await admin.from(name).upsert(chunk, { onConflict: conflict })
    if (!error) {
      restored += chunk.length
      continue
    }
    // 청크 실패 → 행 단위로 재시도해 실패 행만 격리
    for (const row of chunk) {
      const { error: e2 } = await admin.from(name).upsert(row, { onConflict: conflict })
      if (e2) {
        failed++
        if (!firstErr) firstErr = e2.message
      } else {
        restored++
      }
    }
  }
  return { restored, failed, error: firstErr }
}

export async function performRestore(storagePath: string): Promise<RestoreReport> {
  const admin = createAdminClient()
  const { data: blob, error } = await admin.storage.from("backups").download(storagePath)
  if (error || !blob) throw new Error(`백업 파일을 읽을 수 없습니다: ${error?.message ?? "not found"}`)

  let payload: { tables?: Record<string, Record<string, unknown>[]> }
  try {
    payload = JSON.parse(await blob.text())
  } catch {
    throw new Error("백업 파일 형식이 올바르지 않습니다 (JSON 파싱 실패).")
  }
  const tablesData = payload.tables ?? {}

  const tableReports: RestoreReport["tables"] = []
  let totalRestored = 0

  for (const t of BACKUP_TABLES) {
    const rows = (tablesData[t.name] ?? []) as Record<string, unknown>[]
    if (!rows.length) {
      tableReports.push({ name: t.name, restored: 0, failed: 0 })
      continue
    }
    if (t.selfRef) {
      const sr = t.selfRef
      const stripped = rows.map((r) => ({ ...r, [sr]: null }))
      await chunkUpsert(admin, t.name, stripped, t.conflict) // pass 1: 자기참조 null
      const res = await chunkUpsert(admin, t.name, rows, t.conflict) // pass 2: 실제 값
      tableReports.push({ name: t.name, ...res })
      totalRestored += res.restored
    } else {
      const res = await chunkUpsert(admin, t.name, rows, t.conflict)
      tableReports.push({ name: t.name, ...res })
      totalRestored += res.restored
    }
  }

  return {
    ok: tableReports.every((r) => r.failed === 0),
    totalRestored,
    tables: tableReports,
    note: "merge 복원 — 백업에 있는 행을 되살리거나 그 값으로 갱신합니다(기존 행 삭제 없음). auth 로그인 계정은 복원하지 않습니다(관리자→직원 관리에서 관리).",
  }
}
