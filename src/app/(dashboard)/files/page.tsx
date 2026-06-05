import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { FilesClient } from "./files-client"

export default async function FilesPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()

  const [{ data: folderData }, { data: fileData }, { data: empData }] = await Promise.all([
    supabase.from("file_folders").select("*").order("sort").order("name"),
    supabase
      .from("shared_files")
      .select("*, uploader:employees!uploaded_by(name)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("employees").select("id, name").neq("status", "퇴사").order("name"),
  ])

  const folders = (folderData ?? []).map((f) => ({ id: f.id as string, name: f.name as string }))
  const files = (
    (fileData ?? []) as unknown as {
      id: string
      folder_id: string | null
      name: string
      storage_path: string | null
      external_url: string | null
      mime_type: string | null
      size_bytes: number | null
      visibility: string
      uploaded_by: string | null
      created_at: string
      uploader: { name: string } | null
    }[]
  ).map((f) => ({
    id: f.id,
    folder_id: f.folder_id,
    name: f.name,
    url: f.external_url
      ? f.external_url
      : f.storage_path
        ? supabase.storage.from("files").getPublicUrl(f.storage_path).data.publicUrl
        : null,
    isExternal: !!f.external_url,
    size: f.size_bytes,
    visibility: f.visibility,
    uploaderName: f.uploader?.name ?? "-",
    created_at: f.created_at,
    canDelete: f.uploaded_by === me.id || admin,
  }))
  const employees = (empData ?? []).map((e) => ({ id: e.id as string, name: e.name as string }))

  return (
    <div>
      <PageHeader title="자료공유" description="사규 · 양식 · 매뉴얼 등 공용 자료" />
      <FilesClient folders={folders} files={files} employees={employees} isAdmin={admin} />
    </div>
  )
}
