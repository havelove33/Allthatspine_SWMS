-- ============================================================================
-- 올댓스파인 업무관리 시스템 — Phase 2: 예산 (자금 현황 모니터링 · 라이트)
-- 접근 권한: 회계담당(accountant) · 관리자(admin)만 — RLS: is_accountant_or_admin()
-- 철학: 무거운 회계 ERP가 아니라 "자금 현황판". 입력은 최소, 보는 건 충실.
--   · 범위 = 통장 입출금 내역 · 계정별 잔액 · 법인카드 사용내역 현황 (그뿐)
--   · 매출/매입 손익, 정부과제, 증빙대사, 집행률 등은 제외(라이트화)
-- 사용법: Supabase SQL Editor 에 붙여넣고 실행 (또는 Management API). 재실행 안전(idempotent).
-- ============================================================================

-- ─────────────────────────────────────────────
-- 1. 자금 계정 (통장 / 법인카드 / 현금)
-- ─────────────────────────────────────────────
create table if not exists public.budget_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                              -- 예: 기업은행 운영통장, 신한 법인카드
  kind text not null default 'bank',               -- bank(통장) / card(법인카드) / cash(현금)
  opening_balance numeric not null default 0,      -- 기초 잔액(시스템 시작 시점 1회 입력)
  is_active boolean not null default true,
  sort int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2. 거래 내역 (입금/출금/카드결제 통합 원장)
-- ─────────────────────────────────────────────
create table if not exists public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  txn_date date not null,
  direction text not null,                         -- in(입금) / out(출금·카드결제)
  amount numeric not null default 0,               -- 항상 양수, 부호는 direction이 결정
  summary text,                                    -- 적요 (거래 내용)
  counterparty text,                               -- 거래처 (선택)
  account_id uuid references public.budget_accounts(id) on delete set null,
  note text,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_budget_txn_date on public.budget_transactions(txn_date desc);
create index if not exists idx_budget_txn_account on public.budget_transactions(account_id);

-- 라이트화: 초기 초안에서 만든 정부과제/분류 관련 객체 제거 (있을 때만)
drop table if exists public.budget_gov_projects cascade;
alter table public.budget_transactions drop column if exists gov_project_id;
alter table public.budget_transactions drop column if exists category;

-- ============================================================================
-- RLS — 통제된 인원(회계담당/관리자)만 조회·관리 (SELECT 까지 제한)
-- ============================================================================
alter table public.budget_accounts      enable row level security;
alter table public.budget_transactions  enable row level security;

drop policy if exists bacc_all on public.budget_accounts;
drop policy if exists btxn_all on public.budget_transactions;

create policy bacc_all on public.budget_accounts for all to authenticated
  using (public.is_accountant_or_admin()) with check (public.is_accountant_or_admin());
create policy btxn_all on public.budget_transactions for all to authenticated
  using (public.is_accountant_or_admin()) with check (public.is_accountant_or_admin());

-- ============================================================================
-- 끝.
-- ============================================================================
