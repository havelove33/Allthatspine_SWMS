import { createHmac } from "node:crypto"

// 주의: 이 모듈은 서버 전용("use server" 액션에서만 import). 비밀키는 process.env(서버)만 사용.

/**
 * 회전 QR(키오스크) 토큰 — 시간기반 OTP.
 * 비밀키(QR_KIOSK_SECRET)는 서버 전용. 토큰은 PERIOD초마다 바뀐다.
 * 검증 시 시계 오차·스캔 지연을 위해 앞뒤 ±1 윈도우를 허용.
 */
export const KIOSK_PERIOD_SECONDS = 60 * 60 // 1시간

function secret(): string {
  return process.env.QR_KIOSK_SECRET ?? "dev-insecure-kiosk-secret"
}

export function currentWindow(nowMs: number): number {
  return Math.floor(nowMs / 1000 / KIOSK_PERIOD_SECONDS)
}

export function tokenForWindow(win: number): string {
  // 4자리 숫자 코드 (0000~9999) — 입력 편의용. IP 제한·1시간 회전과 병행.
  const digest = createHmac("sha256", secret())
    .update("kiosk:" + win)
    .digest()
  return String(digest.readUInt32BE(0) % 10000).padStart(4, "0")
}

export function currentToken(nowMs: number): {
  token: string
  secondsLeft: number
} {
  const win = currentWindow(nowMs)
  const token = tokenForWindow(win)
  const elapsed = (nowMs / 1000) % KIOSK_PERIOD_SECONDS
  const secondsLeft = Math.max(1, Math.ceil(KIOSK_PERIOD_SECONDS - elapsed))
  return { token, secondsLeft }
}

export function isValidRotatingToken(token: string, nowMs: number): boolean {
  if (!token) return false
  const t = token.trim().toUpperCase()
  const win = currentWindow(nowMs)
  // 현재 윈도우 + 직전 윈도우(경계 시점 스캔·표시 지연 대응)
  return t === tokenForWindow(win) || t === tokenForWindow(win - 1)
}
