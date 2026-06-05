"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getBudgetOrThrow } from "@/lib/auth"

export type BState = { ok: true } | { ok: false; error: string } | undefined

function rv() {
  revalidatePath("/budget")
  revalidatePath("/budget/accounts")
  revalidatePath("/budget/targets")
}

// ───────────────────────── 자금 계정 ─────────────────────────
export interface AccountInput {
  name: string
  kind: string
  opening_balance: number
  note?: string
}

export async function addAccount(input: AccountInput): Promise<BState> {
  await getBudgetOrThrow()
  if (!input.name.trim()) return { ok: false, error: "계정명을 입력하세요." }
  const kind = ["bank", "card", "cash"].includes(input.kind) ? input.kind : "bank"
  const admin = createAdminClient()
  const { error } = await admin.from("budget_accounts").insert({
    name: input.name.trim(),
    kind,
    opening_balance: Number(input.opening_balance) || 0,
    note: input.note?.trim() || null,
  })
  if (error) return { ok: false, error: `추가 실패: ${error.message}` }
  rv()
  return { ok: true }
}

export interface AccountPatch {
  name?: string
  kind?: string
  opening_balance?: number
  is_active?: boolean
  note?: string
}

export async function updateAccount(id: string, patch: AccountPatch): Promise<BState> {
  await getBudgetOrThrow()
  const admin = createAdminClient()
  const data: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    if (!patch.name.trim()) return { ok: false, error: "계정명을 입력하세요." }
    data.name = patch.name.trim()
  }
  if (patch.kind !== undefined)
    data.kind = ["bank", "card", "cash"].includes(patch.kind) ? patch.kind : "bank"
  if (patch.opening_balance !== undefined)
    data.opening_balance = Number(patch.opening_balance) || 0
  if (patch.is_active !== undefined) data.is_active = patch.is_active
  if (patch.note !== undefined) data.note = patch.note?.trim() || null

  const { error } = await admin.from("budget_accounts").update(data).eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  rv()
  return { ok: true }
}

export async function deleteAccount(id: string): Promise<BState> {
  await getBudgetOrThrow()
  const admin = createAdminClient()
  // 거래는 보존(account_id가 null로 설정됨 — FK on delete set null)
  const { error } = await admin.from("budget_accounts").delete().eq("id", id)
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` }
  rv()
  return { ok: true }
}

// ───────────────────────── 거래 내역 ─────────────────────────
export interface TxnInput {
  txn_date: string
  direction: string
  amount: number
  category?: string
  account_id?: string
  summary?: string
  counterparty?: string
  note?: string
}

function validateTxn(input: TxnInput): string | null {
  if (!input.txn_date) return "일자를 선택하세요."
  if (input.direction !== "in" && input.direction !== "out") return "구분을 선택하세요."
  if (!(Number(input.amount) > 0)) return "금액을 올바르게 입력하세요."
  if (!input.summary?.trim()) return "적요를 입력하세요."
  return null
}

export async function addTransaction(input: TxnInput): Promise<BState> {
  const me = await getBudgetOrThrow()
  const err = validateTxn(input)
  if (err) return { ok: false, error: err }
  const admin = createAdminClient()
  const { error } = await admin.from("budget_transactions").insert({
    txn_date: input.txn_date,
    direction: input.direction,
    amount: Number(input.amount),
    category: input.category?.trim() || null,
    account_id: input.account_id || null,
    summary: input.summary?.trim() || null,
    counterparty: input.counterparty?.trim() || null,
    note: input.note?.trim() || null,
    created_by: me.id,
  })
  if (error) return { ok: false, error: `추가 실패: ${error.message}` }
  rv()
  return { ok: true }
}

export async function updateTransaction(id: string, input: TxnInput): Promise<BState> {
  await getBudgetOrThrow()
  const err = validateTxn(input)
  if (err) return { ok: false, error: err }
  const admin = createAdminClient()
  const { error } = await admin
    .from("budget_transactions")
    .update({
      txn_date: input.txn_date,
      direction: input.direction,
      amount: Number(input.amount),
      category: input.category?.trim() || null,
      account_id: input.account_id || null,
      summary: input.summary?.trim() || null,
      counterparty: input.counterparty?.trim() || null,
      note: input.note?.trim() || null,
    })
    .eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  rv()
  return { ok: true }
}

export async function deleteTransaction(id: string): Promise<BState> {
  await getBudgetOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("budget_transactions").delete().eq("id", id)
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` }
  rv()
  return { ok: true }
}

// ───────────────────────── 매출 목표 ─────────────────────────
export interface SalesTargetInput {
  year: number
  item: string
  annual_target: number
  monthly_targets?: Record<string, number>
}

export async function addSalesTarget(input: SalesTargetInput): Promise<BState> {
  await getBudgetOrThrow()
  if (!input.item.trim()) return { ok: false, error: "항목명을 입력하세요." }
  const admin = createAdminClient()
  const { error } = await admin.from("budget_sales_targets").insert({
    year: input.year,
    item: input.item.trim(),
    annual_target: Number(input.annual_target) || 0,
    monthly_targets: input.monthly_targets ?? {},
  })
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "같은 연도에 동일한 항목이 이미 있습니다." : `추가 실패: ${error.message}`,
    }
  rv()
  return { ok: true }
}

export async function updateSalesTarget(
  id: string,
  patch: { item?: string; annual_target?: number; monthly_targets?: Record<string, number> }
): Promise<BState> {
  await getBudgetOrThrow()
  const admin = createAdminClient()
  const data: Record<string, unknown> = {}
  if (patch.item !== undefined) {
    if (!patch.item.trim()) return { ok: false, error: "항목명을 입력하세요." }
    data.item = patch.item.trim()
  }
  if (patch.annual_target !== undefined) data.annual_target = Number(patch.annual_target) || 0
  if (patch.monthly_targets !== undefined) data.monthly_targets = patch.monthly_targets
  const { error } = await admin.from("budget_sales_targets").update(data).eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  rv()
  return { ok: true }
}

export async function deleteSalesTarget(id: string): Promise<BState> {
  await getBudgetOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("budget_sales_targets").delete().eq("id", id)
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` }
  rv()
  return { ok: true }
}
