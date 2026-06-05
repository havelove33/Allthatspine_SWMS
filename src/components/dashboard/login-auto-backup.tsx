"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { DownloadCloud } from "lucide-react"
import { loginSnapshot } from "@/app/(dashboard)/admin/backup/actions"
import { cn } from "@/lib/utils"

const DONE_KEY = "loginAutoBackupDone"
const PREF_KEY = "autoLoginBackup" // "on" = 활성, 그 외/없음 = 비활성 (기본 OFF)
const PREF_EVENT = "auto-login-backup-change"

// ── 설정값(localStorage)을 React로 안전하게 읽기 ──
function prefSubscribe(cb: () => void) {
  window.addEventListener("storage", cb)
  window.addEventListener(PREF_EVENT, cb)
  return () => {
    window.removeEventListener("storage", cb)
    window.removeEventListener(PREF_EVENT, cb)
  }
}
function prefGet(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "on"
  } catch {
    return false
  }
}
function prefServer(): boolean {
  return false // 기본 OFF (SSR)
}

/**
 * 관리자 로그인 시 1회: DB 스냅샷을 만들어 관리자 PC로 자동 다운로드.
 * 단, 대시보드 스위치(기본 OFF)가 켜져 있을 때만 동작.
 */
export function LoginAutoBackup() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    let shouldRun = false
    try {
      if (localStorage.getItem(PREF_KEY) !== "on") return // 스위치 꺼짐 → 동작 안 함
      if (!localStorage.getItem(DONE_KEY)) {
        localStorage.setItem(DONE_KEY, new Date().toISOString())
        shouldRun = true
      }
    } catch {
      shouldRun = false
    }
    if (!shouldRun) return

    void (async () => {
      const res = await loginSnapshot()
      if (!res.ok) return // 조용히 실패 — 앱 사용을 방해하지 않음
      try {
        const blob = new Blob([res.json], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = res.filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success(`로그인 백업을 PC에 저장했습니다 (${res.totalRows.toLocaleString()}행)`)
      } catch {
        // 다운로드 차단 등 — 무시
      }
    })()
  }, [])

  return null
}

/** 로그인 페이지에서 호출 — 다음 로그인 시 자동 백업이 다시 실행되도록 플래그 초기화. */
export function ClearLoginBackupFlag() {
  useEffect(() => {
    try {
      localStorage.removeItem(DONE_KEY)
    } catch {
      // ignore
    }
  }, [])
  return null
}

/** 관리자 대시보드용 — 로그인 시 자동 백업 on/off 스위치 (이 브라우저 기준, 기본 OFF). */
export function AutoBackupSwitch() {
  const enabled = useSyncExternalStore(prefSubscribe, prefGet, prefServer)

  function toggle() {
    try {
      localStorage.setItem(PREF_KEY, enabled ? "off" : "on")
      window.dispatchEvent(new Event(PREF_EVENT))
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <DownloadCloud className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          로그인 시 자동 백업 <span className="font-normal text-muted-foreground">(이 PC)</span>
        </p>
        <p className="text-xs text-muted-foreground">
          켜면 관리자가 로그인할 때마다 DB 스냅샷이 이 컴퓨터로 자동 다운로드됩니다. (기본: 꺼짐)
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="로그인 시 자동 백업"
        onClick={toggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          enabled ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  )
}
