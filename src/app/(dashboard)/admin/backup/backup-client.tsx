"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Database, Download, Upload, Trash2, RotateCcw, ShieldCheck } from "lucide-react"
import {
  createBackupAction,
  getBackupUrl,
  deleteBackupAction,
  uploadRestoreFile,
  restoreAction,
} from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Backup = {
  id: string
  filename: string
  storage_path: string
  kind: string
  total_rows: number
  size_bytes: number
  created_at: string
}

type Report = {
  ok: boolean
  totalRestored: number
  tables: { name: string; restored: number; failed: number; error?: string }[]
  note: string
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function BackupManager({ backups }: { backups: Backup[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // 복원 다이얼로그
  const [open, setOpen] = useState(false)
  const [restorePath, setRestorePath] = useState<string | null>(null)
  const [restoreLabel, setRestoreLabel] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [restoring, setRestoring] = useState(false)
  const [report, setReport] = useState<Report | null>(null)

  async function doBackup() {
    setBackingUp(true)
    const res = await createBackupAction()
    setBackingUp(false)
    if (res?.ok) {
      toast.success(`백업 완료 — ${res.totalRows.toLocaleString()}행`)
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "백업 실패")
  }

  async function doDownload(id: string) {
    setBusyId(id)
    const res = await getBackupUrl(id)
    setBusyId(null)
    if (res.ok) window.open(res.url, "_blank")
    else toast.error(res.error)
  }

  async function doDelete(id: string) {
    if (!confirm("이 백업 파일을 삭제할까요?")) return
    setBusyId(id)
    const res = await deleteBackupAction(id)
    setBusyId(null)
    if (res?.ok) {
      toast.success("삭제했습니다.")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  function openRestore(path: string, label: string) {
    setRestorePath(path)
    setRestoreLabel(label)
    setConfirmText("")
    setReport(null)
    setOpen(true)
  }

  async function onUploadRestore(file: File) {
    const fd = new FormData()
    fd.set("file", file)
    const res = await uploadRestoreFile(fd)
    if (res.ok) openRestore(res.path, file.name)
    else toast.error(res.error)
  }

  async function doRestore() {
    if (!restorePath) return
    if (confirmText !== "복원") {
      toast.error('확인란에 "복원"을 입력하세요.')
      return
    }
    setRestoring(true)
    const res = await restoreAction(restorePath, confirmText)
    setRestoring(false)
    if (res.ok) {
      setReport(res.report)
      toast.success(`복원 완료 — ${res.report.totalRestored.toLocaleString()}행`)
      router.refresh()
    } else toast.error(res.error)
  }

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          백업 전략 (3중 보호)
        </h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>· <b>로그인 자동 백업</b> — <b>관리자 대시보드의 스위치</b>를 켜면, 로그인할 때마다 스냅샷이 이 PC로 자동 다운로드됩니다 (기본: 꺼짐)</li>
          <li>· <b>매일 자동 백업</b> — 새벽 3시(KST) Vercel Cron으로 클라우드(Storage)에 저장</li>
          <li>· <b>수동 백업</b> — 아래 ‘지금 백업’으로 언제든 스냅샷 생성(클라우드 저장)</li>
          <li>· <b>이중화</b> — 백업 파일을 <b>다운로드</b>해 PC·외부 드라이브에 한 부 더 보관하세요</li>
        </ul>
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ 자동 백업은 배포 환경에서 <code>CRON_SECRET</code> 환경변수 설정 시 작동합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={doBackup} disabled={backingUp}>
            <Database className="size-4" />
            {backingUp ? "백업 중…" : "지금 백업"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUploadRestore(f)
              e.target.value = ""
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            외부 파일로 복원
          </Button>
        </div>
      </div>

      {/* 백업 목록 */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>생성 일시</TableHead>
              <TableHead>종류</TableHead>
              <TableHead className="text-right">행 수</TableHead>
              <TableHead className="text-right">크기</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{fmtDate(b.created_at)}</TableCell>
                <TableCell>
                  <Badge variant={b.kind === "auto" ? "secondary" : "default"} className="text-[10px]">
                    {b.kind === "auto" ? "자동" : "수동"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{b.total_rows.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmtSize(b.size_bytes)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => doDownload(b.id)} disabled={busyId === b.id} title="다운로드">
                      <Download className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openRestore(b.storage_path, b.filename)} title="복원">
                      <RotateCcw className="size-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => doDelete(b.id)} disabled={busyId === b.id} title="삭제">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {backups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  아직 백업이 없습니다. ‘지금 백업’으로 첫 백업을 만드세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 복원 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>데이터 복원</DialogTitle>
          </DialogHeader>

          {!report ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">{restoreLabel}</span> 백업으로 복원합니다.
              </p>
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                · 백업에 있는 행을 <b>되살리거나 그 값으로 덮어씁니다</b> (기존 행 삭제는 하지 않음).<br />
                · 백업 이후 변경된 데이터는 백업 시점 값으로 바뀔 수 있습니다.<br />
                · 로그인 계정(auth)은 복원되지 않습니다.
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm">
                  계속하려면 <b>복원</b> 을 입력하세요
                </label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="복원" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  취소
                </Button>
                <Button variant="destructive" onClick={doRestore} disabled={restoring || confirmText !== "복원"}>
                  {restoring ? "복원 중…" : "복원 실행"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {report.ok ? "✅ 복원 완료" : "⚠️ 복원 완료 (일부 실패)"} — 총{" "}
                {report.totalRestored.toLocaleString()}행
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <tbody>
                    {report.tables
                      .filter((t) => t.restored > 0 || t.failed > 0)
                      .map((t) => (
                        <tr key={t.name} className="border-b last:border-0">
                          <td className="px-2 py-1">{t.name}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{t.restored}</td>
                          <td className={cn("px-2 py-1 text-right tabular-nums", t.failed > 0 && "text-destructive")}>
                            {t.failed > 0 ? `실패 ${t.failed}` : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">{report.note}</p>
              <div className="flex justify-end">
                <Button onClick={() => setOpen(false)}>닫기</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
