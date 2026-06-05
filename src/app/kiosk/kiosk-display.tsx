"use client"

import { useCallback, useEffect, useState } from "react"
import { Maximize, Minimize, LogOut } from "lucide-react"
import { getKioskQr, type KioskQr } from "./actions"
import { signOut } from "@/app/(auth)/login/actions"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export function KioskDisplay() {
  const [data, setData] = useState<KioskQr | null>(null)
  const [left, setLeft] = useState(0)
  const [error, setError] = useState(false)
  const [isFs, setIsFs] = useState(false)

  // 회전 QR 주기적 동기화 (토큰은 1시간마다 변경)
  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const res = await getKioskQr()
        if (!active) return
        setData(res)
        setLeft(res.secondsLeft)
        setError(false)
      } catch {
        if (active) setError(true)
      }
    }
    refresh()
    const poll = setInterval(refresh, 30000)
    return () => {
      active = false
      clearInterval(poll)
    }
  }, [])

  // 1초 카운트다운
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  // 전체화면 상태 추적
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  const mm = Math.floor(left / 60)
  const ss = left % 60
  const countdown = `${mm}:${String(ss).padStart(2, "0")}`

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      {/* 우측 상단 컨트롤 */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          {isFs ? "해제" : "전체화면"}
        </Button>
        {!isFs && (
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4" />
              로그아웃
            </Button>
          </form>
        )}
      </div>

      <Logo className="h-12" />
      <p className="text-xl font-semibold text-muted-foreground">출근 QR을 스캔하세요</p>

      {error ? (
        <p className="text-destructive">QR을 불러오지 못했습니다. 잠시 후 자동 재시도됩니다.</p>
      ) : data ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.qr}
            alt="출근 QR"
            className="aspect-square w-[min(70vmin,420px)] rounded-2xl border-8 border-white shadow-xl"
          />
          <div className="w-[min(70vmin,420px)] text-center">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (left / (data.period || 3600)) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{countdown} 후 코드 변경</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-6 py-3 text-center">
            <p className="text-xs text-muted-foreground">수동 입력용 코드</p>
            <p className="font-mono text-4xl font-bold tracking-[0.4em]">{data.token}</p>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">QR 불러오는 중…</p>
      )}
    </div>
  )
}
