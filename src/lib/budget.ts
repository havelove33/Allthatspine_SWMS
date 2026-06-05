import type { BudgetAccount, BudgetAccountKind, BudgetTransaction } from "@/types"

/** 원화 표기: 1234567 → "₩1,234,567" (음수는 -₩..). */
export function formatKRW(n: number): string {
  const v = Math.round(Number(n) || 0)
  const sign = v < 0 ? "-" : ""
  return `${sign}₩${Math.abs(v).toLocaleString("ko-KR")}`
}

/** 부호 포함 표기: 입금 +₩.., 출금 −₩.. */
export function formatSigned(direction: TxnLike, amount: number): string {
  const base = formatKRW(Math.abs(Number(amount) || 0))
  return direction === "in" ? `+${base}` : `−${base}`
}
type TxnLike = "in" | "out"

export const ACCOUNT_KIND_LABEL: Record<BudgetAccountKind, string> = {
  bank: "통장",
  card: "법인카드",
  cash: "현금",
}

export const DIRECTION_LABEL: Record<TxnLike, string> = {
  in: "입금",
  out: "출금",
}

/**
 * 계정별 현재 잔액 맵 = 기초잔액 + Σ입금 − Σ출금.
 * (transactions 전체를 1회 순회 — 소규모 데이터 가정)
 */
export function balancesByAccount(
  accounts: Pick<BudgetAccount, "id" | "opening_balance">[],
  txns: Pick<BudgetTransaction, "account_id" | "direction" | "amount">[]
): Map<string, number> {
  const bal = new Map<string, number>()
  for (const a of accounts) bal.set(a.id, Number(a.opening_balance) || 0)
  for (const t of txns) {
    if (!t.account_id || !bal.has(t.account_id)) continue
    const delta = t.direction === "in" ? Number(t.amount) : -Number(t.amount)
    bal.set(t.account_id, (bal.get(t.account_id) ?? 0) + delta)
  }
  return bal
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function monthKey(dateStr: string): string {
  return (dateStr || "").slice(0, 7)
}

/**
 * 거래 집계 버킷.
 * 카드 계정 거래(카드 사용)는 'card'로 분리 — 실제 통장에서 빠지는 카드대금과
 * 이중 계상되지 않도록 '출금' 합계에서 제외한다.
 */
export type TxnBucket = "in" | "out" | "card"
export function txnBucket(
  direction: string,
  accountKind: string | null | undefined
): TxnBucket {
  if (accountKind === "card") return "card"
  return direction === "in" ? "in" : "out"
}
