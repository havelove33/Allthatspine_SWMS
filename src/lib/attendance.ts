/**
 * 근태 검증 핵심 로직 (순수 함수 — 서버에서 호출).
 *  - IP CIDR 매칭 (회사 IP 대역 확인)
 *  - 클라이언트 IP 추출 (Vercel x-forwarded-for)
 *  - 지각 / 조기퇴근 / 근무시간 판정 (KST 기준)
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000 // 한국 표준시 UTC+9 (DST 없음)

/** IPv4 문자열 → 32비트 정수. 형식이 틀리면 null. */
export function ipv4ToLong(ip: string): number | null {
  const parts = ip.trim().split(".")
  if (parts.length !== 4) return null
  let result = 0
  for (const p of parts) {
    const n = Number(p)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    result = result * 256 + n
  }
  return result >>> 0
}

/** ip가 CIDR(예: "192.168.101.0/24") 범위 안에 있는지. */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/")
  const bits = bitsStr === undefined ? 32 : Number(bitsStr)
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false

  const ipLong = ipv4ToLong(ip)
  const rangeLong = ipv4ToLong(range)
  if (ipLong === null || rangeLong === null) return false

  if (bits === 0) return true
  const mask = (0xffffffff << (32 - bits)) >>> 0
  return (ipLong & mask) === (rangeLong & mask)
}

/** ip가 허용 대역 목록 중 하나라도 만족하는지. */
export function isIpAllowed(ip: string, ranges: string[]): boolean {
  return ranges.some((cidr) => isIpInCidr(ip, cidr))
}

/** 요청 헤더에서 클라이언트 공인 IP 추출 (Vercel 환경). */
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return headers.get("x-real-ip")
}

/** Date(절대 시각) → KST 벽시계 시/분. */
export function getKstHm(date: Date): { hours: number; minutes: number } {
  const kst = new Date(date.getTime() + KST_OFFSET_MS)
  return { hours: kst.getUTCHours(), minutes: kst.getUTCMinutes() }
}

/** "HH:MM" 또는 "HH:MM:SS" → 자정 기준 분. */
export function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) — work_date 용. */
export function getKstDateString(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS)
  return kst.toISOString().slice(0, 10)
}

export type CheckInJudgement = { isLate: boolean; status: "정상" | "지각" }

/** 출근 시각 기준 지각 여부 판정. */
export function judgeCheckIn(
  checkInAt: Date,
  workStartTime: string,
  graceMinutes: number
): CheckInJudgement {
  const { hours, minutes } = getKstHm(checkInAt)
  const nowMin = hours * 60 + minutes
  const startMin = timeStringToMinutes(workStartTime) + (graceMinutes || 0)
  const isLate = nowMin > startMin
  return { isLate, status: isLate ? "지각" : "정상" }
}

/** 퇴근 시각 기준 조기퇴근 여부 판정. */
export function judgeCheckOut(
  checkOutAt: Date,
  workEndTime: string
): { isEarlyLeave: boolean } {
  const { hours, minutes } = getKstHm(checkOutAt)
  const nowMin = hours * 60 + minutes
  const endMin = timeStringToMinutes(workEndTime)
  return { isEarlyLeave: nowMin < endMin }
}

/** 근무시간(분) 계산. */
export function calcWorkMinutes(checkInAt: Date, checkOutAt: Date): number {
  return Math.max(
    0,
    Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)
  )
}

/** ISO 시각 → KST "HH:MM" 문자열. */
export function formatKstTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const { hours, minutes } = getKstHm(new Date(iso))
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/** 분 → "N시간 M분". */
export function formatWorkMinutes(min: number | null | undefined): string | null {
  if (min == null) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}시간 ${m}분`
}

/** KST 기준 현재 연-월 ("YYYY-MM"). */
export function getKstYearMonth(date: Date): string {
  return getKstDateString(date).slice(0, 7)
}
