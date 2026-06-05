import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { BackupManager } from "./backup-client"

export const maxDuration = 60

export default async function BackupPage() {
  await requireRole(["admin"])
  const supabase = await createClient()
  const { data } = await supabase
    .from("db_backups")
    .select("id, filename, storage_path, kind, total_rows, size_bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  const backups = (data ?? []).map((b) => ({
    id: b.id as string,
    filename: b.filename as string,
    storage_path: b.storage_path as string,
    kind: b.kind as string,
    total_rows: b.total_rows as number,
    size_bytes: b.size_bytes as number,
    created_at: b.created_at as string,
  }))

  return (
    <div>
      <PageHeader
        title="데이터 백업 · 복원"
        description="전체 데이터를 스냅샷으로 백업하고 복원합니다. (관리자 전용)"
      />
      <BackupManager backups={backups} />
    </div>
  )
}
