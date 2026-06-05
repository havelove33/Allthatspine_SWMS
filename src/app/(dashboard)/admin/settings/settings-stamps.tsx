/* eslint-disable @next/next/no-img-element */
"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { uploadFile } from "@/app/(dashboard)/upload-actions"
import { saveSealImage, saveMySignature } from "./actions"
import { Button } from "@/components/ui/button"
import type { SettingsState } from "./actions"

function StampField({
  label,
  hint,
  url,
  onSave,
}: {
  label: string
  hint: string
  url: string | null
  onSave: (u: string | null) => Promise<SettingsState>
}) {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onPick(file: File) {
    setBusy(true)
    const fd = new FormData()
    fd.set("file", file)
    const up = await uploadFile(fd)
    if (!up.ok) {
      setBusy(false)
      toast.error(up.error)
      return
    }
    const res = await onSave(up.url)
    setBusy(false)
    if (res?.ok) {
      toast.success("저장되었습니다.")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  async function onRemove() {
    setBusy(true)
    const res = await onSave(null)
    setBusy(false)
    if (res?.ok) {
      toast.success("삭제했습니다.")
      router.refresh()
    } else toast.error(res && !res.ok ? res.error : "오류")
  }

  return (
    <div>
      <h3 className="text-sm font-medium">{label}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center rounded-md border bg-white">
          {url ? (
            <img src={url} alt={label} className="max-h-20 max-w-20 object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">없음</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPick(f)
              e.target.value = ""
            }}
          />
          <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? "처리 중…" : url ? "이미지 변경" : "이미지 업로드"}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
              삭제
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SettingsStamps({ seal, signature }: { seal: string | null; signature: string | null }) {
  return (
    <div className="mt-6 max-w-2xl rounded-lg border bg-card p-5">
      <h2 className="mb-1 font-semibold">전자결재 직인 · 서명</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        결재 문서 하단의 회사 날인(직인)과 승인란 서명에 사용됩니다. <b>배경이 투명한 PNG</b>를 권장합니다.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <StampField label="회사 직인" hint="문서 하단 회사명 옆에 날인됩니다." url={seal} onSave={saveSealImage} />
        <StampField label="내 서명 (결재용)" hint="내가 승인하면 승인란에 표시됩니다." url={signature} onSave={saveMySignature} />
      </div>
    </div>
  )
}
