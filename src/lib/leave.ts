// 휴가 관련 순수 헬퍼

export interface LeaveTypeDef {
  value: string
  label: string
  consumes: boolean // 연차 차감 여부
  half: boolean // 반차(0.5일)
  quarter?: boolean // 반반차(0.25일)
}

export const LEAVE_TYPES: LeaveTypeDef[] = [
  { value: "연차", label: "연차", consumes: true, half: false },
  { value: "오전반차", label: "오전 반차", consumes: true, half: true },
  { value: "오후반차", label: "오후 반차", consumes: true, half: true },
  { value: "반반차", label: "반반차(0.25일)", consumes: true, half: false, quarter: true },
  { value: "병가", label: "병가", consumes: false, half: false },
  { value: "경조사", label: "경조사", consumes: false, half: false },
  { value: "공가", label: "공가", consumes: false, half: false },
  { value: "무급", label: "무급휴가", consumes: false, half: false },
]

export function leaveTypeDef(type: string): LeaveTypeDef | undefined {
  return LEAVE_TYPES.find((t) => t.value === type)
}

/** start~end(YYYY-MM-DD, 포함) 사이 평일 수. */
export function countWeekdays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00Z")
  const e = new Date(end + "T00:00:00Z")
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0
  let count = 0
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

/** 휴가 종류·기간으로 사용일수 계산. */
export function computeLeaveDays(type: string, start: string, end: string): number {
  const def = leaveTypeDef(type)
  if (def?.quarter) return 0.25
  if (def?.half) return 0.5
  return countWeekdays(start, end)
}

function ymd(s: string) {
  const [y, m, d] = s.split("-").map(Number)
  return { y, m, d }
}

/**
 * 입사일 기준 법정 연차 발생일수 (asOf 시점). 근로기준법 제60조.
 * - 1년 미만: 1개월 개근마다 1일 (최대 11일)
 * - 1년 이상: 15일 + 3년 이상부터 2년마다 1일 가산 (최대 25일)
 */
export function computeAnnualEntitlement(
  hireDate: string | null | undefined,
  asOf: string
): number {
  if (!hireDate || !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) return 0
  const h = ymd(hireDate)
  const a = ymd(asOf)
  let months = (a.y - h.y) * 12 + (a.m - h.m)
  if (a.d < h.d) months -= 1
  if (months < 0) return 0
  if (months < 12) return Math.min(11, months)
  const years = Math.floor(months / 12)
  return 15 + Math.min(10, Math.floor((years - 1) / 2))
}

/** 현재 연차연도 시작일 (입사일 기준, asOf 이전 가장 최근 입사기념일). */
export function currentLeaveYearStart(
  hireDate: string | null | undefined,
  asOf: string
): string | null {
  if (!hireDate || !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) return null
  const hireMMDD = hireDate.slice(5)
  const todayMMDD = asOf.slice(5)
  const year = todayMMDD >= hireMMDD ? Number(asOf.slice(0, 4)) : Number(asOf.slice(0, 4)) - 1
  return `${year}-${hireMMDD}`
}

/** start~end 사이 평일 날짜 목록(YYYY-MM-DD). */
export function weekdaysBetween(start: string, end: string): string[] {
  const s = new Date(start + "T00:00:00Z")
  const e = new Date(end + "T00:00:00Z")
  const out: string[] = []
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return out
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10))
  }
  return out
}
