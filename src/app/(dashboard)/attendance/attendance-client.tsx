"use client"

import { useState } from "react"
import { toast } from "sonner"
import { LogIn, LogOut, CheckCircle2 } from "lucide-react"
import { checkIn, checkOut } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export interface TodayState {
  checkedIn: boolean
  checkedOut: boolean
  checkInTime: string | null
  checkOutTime: string | null
  status: string | null
  workText: string | null
}

export function CheckInOut({
  today,
  defaultToken,
}: {
  today: TodayState
  defaultToken: string
}) {
  const [token, setToken] = useState(defaultToken)
  const [pending, setPending] = useState<null | "in" | "out">(null)

  async function doCheckIn() {
    if (!token.trim()) {
      toast.error("QR을 스캔하거나 사무실 코드를 입력하세요.")
      return
    }
    setPending("in")
    const fd = new FormData()
    fd.set("token", token.trim())
    const res = await checkIn(undefined, fd)
    setPending(null)
    if (res?.ok) toast.success(res.message)
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  async function doCheckOut() {
    setPending("out")
    const res = await checkOut()
    setPending(null)
    if (res?.ok) toast.success(res.message)
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      {/* 완료 상태 */}
      {today.checkedOut ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <p className="text-lg font-semibold">오늘 근무 완료</p>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">출근</p>
              <p className="font-medium">{today.checkInTime}</p>
            </div>
            <div>
              <p className="text-muted-foreground">퇴근</p>
              <p className="font-medium">{today.checkOutTime}</p>
            </div>
            {today.workText && (
              <div>
                <p className="text-muted-foreground">근무시간</p>
                <p className="font-medium">{today.workText}</p>
              </div>
            )}
          </div>
          {today.status && <Badge variant="secondary">{today.status}</Badge>}
        </div>
      ) : today.checkedIn ? (
        /* 출근만 한 상태 → 퇴근 버튼 */
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">출근 완료</p>
          <p className="text-3xl font-bold tabular-nums">{today.checkInTime}</p>
          {today.status === "지각" && <Badge variant="secondary">지각</Badge>}
          <Button
            size="lg"
            variant="destructive"
            className="mt-2 h-14 w-full max-w-xs text-base"
            onClick={doCheckOut}
            disabled={pending !== null}
          >
            <LogOut className="size-5" />
            {pending === "out" ? "처리 중…" : "퇴근하기"}
          </Button>
        </div>
      ) : (
        /* 미출근 → 출근 */
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-sm text-muted-foreground">아직 출근 전입니다</p>
          <div className="w-full max-w-xs space-y-2 text-left">
            <Label htmlFor="qr-token">QR 스캔 또는 4자리 코드</Label>
            <Input
              id="qr-token"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
          <Button
            size="lg"
            className="mt-1 h-14 w-full max-w-xs text-base"
            onClick={doCheckIn}
            disabled={pending !== null}
          >
            <LogIn className="size-5" />
            {pending === "in" ? "처리 중…" : "출근하기"}
          </Button>
        </div>
      )}
    </div>
  )
}
