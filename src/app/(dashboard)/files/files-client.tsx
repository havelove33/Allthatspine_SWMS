"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, Trash2, File as FileIcon, ExternalLink, Search, FolderPlus, X } from "lucide-react"
import { createFolder, deleteFolder, createFile, deleteFile } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Folder = { id: string; name: string }
type FileRow = {
  id: string
  folder_id: string | null
  name: string
  url: string | null
  isExternal: boolean
  size: number | null
  visibility: string
  uploaderName: string
  created_at: string
  canDelete: boolean
}
type Emp = { id: string; name: string }

const FIELD =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

function fmtSize(n: number | null): string {
  if (!n) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function FilesClient({
  folders,
  files,
  employees,
  isAdmin,
}: {
  folders: Folder[]
  files: FileRow[]
  employees: Emp[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [folder, setFolder] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [newFolder, setNewFolder] = useState("")

  // 업로드 다이얼로그
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"file" | "link">("file")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [destFolder, setDestFolder] = useState("")
  const [visibility, setVisibility] = useState("all")
  const [grants, setGrants] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const filtered = files.filter(
    (f) =>
      (folder === "all" || f.folder_id === folder) &&
      (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  )

  async function onAddFolder() {
    if (!newFolder.trim()) return
    const res = await createFolder(newFolder)
    if (res?.ok) {
      toast.success("폴더를 추가했습니다.")
      setNewFolder("")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function onDeleteFolder(id: string) {
    if (!confirm("폴더를 삭제할까요? (폴더 안 파일은 ‘미분류’로 남습니다)")) return
    const res = await deleteFolder(id)
    if (res?.ok) {
      if (folder === id) setFolder("all")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  function openUpload() {
    setMode("file")
    setName("")
    setUrl("")
    setDestFolder(folder === "all" ? "" : folder)
    setVisibility("all")
    setGrants([])
    setOpen(true)
  }

  async function onUpload() {
    const fd = new FormData()
    const picked = fileRef.current?.files?.[0]
    if (mode === "file") {
      if (!picked) {
        toast.error("파일을 선택하세요.")
        return
      }
      fd.set("file", picked)
    } else {
      if (!url.trim()) {
        toast.error("링크 URL을 입력하세요.")
        return
      }
      fd.set("external_url", url.trim())
    }
    fd.set("name", name.trim())
    fd.set("folder_id", destFolder)
    fd.set("visibility", visibility)
    fd.set("grants", JSON.stringify(grants))
    setBusy(true)
    const res = await createFile(fd)
    setBusy(false)
    if (res?.ok) {
      toast.success("올렸습니다.")
      setOpen(false)
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  async function onDeleteFile(id: string) {
    if (!confirm("이 파일을 삭제할까요?")) return
    const res = await deleteFile(id)
    if (res?.ok) router.refresh()
    else toast.error(res && !res.ok ? res.error : "오류")
  }

  return (
    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
      {/* 폴더 */}
      <aside className="space-y-1">
        <button
          onClick={() => setFolder("all")}
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-sm font-medium",
            folder === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          전체
        </button>
        {folders.map((f) => (
          <div key={f.id} className="group flex items-center">
            <button
              onClick={() => setFolder(f.id)}
              className={cn(
                "flex-1 truncate rounded-md px-3 py-2 text-left text-sm",
                folder === f.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {f.name}
            </button>
            {isAdmin && (
              <button
                onClick={() => onDeleteFolder(f.id)}
                className="ml-1 hidden text-muted-foreground hover:text-destructive group-hover:block"
                title="폴더 삭제"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {isAdmin && (
          <div className="flex gap-1 pt-2">
            <Input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="새 폴더"
              className="h-8 text-sm"
            />
            <Button size="icon-sm" variant="outline" onClick={onAddFolder} title="폴더 추가">
              <FolderPlus className="size-4" />
            </Button>
          </div>
        )}
      </aside>

      {/* 파일 목록 */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="파일 검색"
              className="pl-8"
            />
          </div>
          <Button onClick={openUpload}>
            <Upload className="size-4" />
            올리기
          </Button>
        </div>

        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              {f.isExternal ? (
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener"
                    className="truncate font-medium hover:underline"
                  >
                    {f.name}
                  </a>
                ) : (
                  <span className="truncate font-medium">{f.name}</span>
                )}
                <p className="text-xs text-muted-foreground">
                  {f.uploaderName} · {f.created_at.slice(0, 10)}
                  {f.size ? ` · ${fmtSize(f.size)}` : ""}
                </p>
              </div>
              {f.visibility === "restricted" && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  지정공개
                </Badge>
              )}
              {f.canDelete && (
                <button
                  onClick={() => onDeleteFile(f.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="삭제"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">자료가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 업로드 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>자료 올리기</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("file")}
              >
                파일 업로드
              </Button>
              <Button
                type="button"
                variant={mode === "link" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("link")}
              >
                외부 링크
              </Button>
            </div>

            {mode === "file" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="f-file">파일 (50MB 이하)</Label>
                <input id="f-file" ref={fileRef} type="file" className="text-sm" />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="f-url">링크 URL (구글드라이브 등)</Label>
                <Input id="f-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="f-name">표시 이름{mode === "file" ? " (비우면 파일명)" : ""}</Label>
              <Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="자료 이름" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="f-folder">폴더</Label>
                <select id="f-folder" className={FIELD} value={destFolder} onChange={(e) => setDestFolder(e.target.value)}>
                  <option value="">미분류</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="f-vis">공개 범위</Label>
                <select id="f-vis" className={FIELD} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="all">전체 공개</option>
                  <option value="restricted">지정 인원</option>
                </select>
              </div>
            </div>

            {visibility === "restricted" && (
              <div className="grid gap-1.5">
                <Label>열람 허용 인원</Label>
                <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={grants.includes(e.id)}
                        onChange={(ev) =>
                          setGrants((g) =>
                            ev.target.checked ? [...g, e.id] : g.filter((x) => x !== e.id)
                          )
                        }
                      />
                      {e.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="-mx-4 -mb-4 mt-1 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={onUpload} disabled={busy}>
              {busy ? "올리는 중…" : "올리기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
