"use server"

import QRCode from "qrcode"
import { headers } from "next/headers"
import { getKioskOrThrow } from "@/lib/auth"
import { currentToken, KIOSK_PERIOD_SECONDS } from "@/lib/kiosk"

export type KioskQr = {
  qr: string
  token: string
  secondsLeft: number
  period: number
}

/** 현재 회전 토큰으로 QR 이미지를 생성 (키오스크/관리자 전용). */
export async function getKioskQr(): Promise<KioskQr> {
  await getKioskOrThrow()

  const { token, secondsLeft } = currentToken(Date.now())

  const h = await headers()
  const host = h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  const url = `${proto}://${host}/attendance?token=${token}`

  const qr = await QRCode.toDataURL(url, {
    width: 600,
    margin: 2,
    color: { dark: "#0C6675", light: "#ffffff" },
  })

  return { qr, token, secondsLeft, period: KIOSK_PERIOD_SECONDS }
}
