import Holidays from "date-holidays"

// 한국 공휴일 (설날·추석 등 음력, 대체공휴일 포함). 서버 전용.
let hd: InstanceType<typeof Holidays> | null = null
function instance() {
  if (!hd) hd = new Holidays("KR")
  return hd
}

const cache = new Map<number, Set<string>>()
function yearSet(year: number): Set<string> {
  const cached = cache.get(year)
  if (cached) return cached
  const set = new Set<string>()
  for (const h of instance().getHolidays(year)) {
    if (h.type === "public") set.add(h.date.slice(0, 10))
  }
  cache.set(year, set)
  return set
}

export function isKoreanHoliday(dateStr: string): boolean {
  const year = Number(dateStr.slice(0, 4))
  if (!year) return false
  return yearSet(year).has(dateStr)
}

/** start~end(YYYY-MM-DD, 포함) 사이 공휴일 날짜 집합. */
export function holidaysInRange(start: string, end: string): Set<string> {
  const sy = Number(start.slice(0, 4))
  const ey = Number(end.slice(0, 4))
  const out = new Set<string>()
  if (!sy || !ey) return out
  for (let y = sy; y <= ey; y++) {
    for (const d of yearSet(y)) {
      if (d >= start && d <= end) out.add(d)
    }
  }
  return out
}
