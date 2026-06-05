-- ============================================================================
-- 올댓스파인 — 예산: 매출 목표 추적 (연간/월간 목표 + 세부 항목)
-- 접근: 회계담당/관리자 (RLS is_accountant_or_admin). 재실행 안전.
-- ============================================================================

-- 매출 항목 분류용 컬럼 복원 (입금 거래의 매출 항목)
alter table public.budget_transactions add column if not exists category text;

-- 매출 목표 (연도 × 항목)
create table if not exists public.budget_sales_targets (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  item text not null,                              -- 매출 항목명 (예: 제품매출, 서비스매출)
  annual_target numeric not null default 0,        -- 연간 목표(필수)
  monthly_targets jsonb not null default '{}',     -- 월간 목표(선택) {"1":1000000,...}
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (year, item)
);

create index if not exists idx_sales_targets_year on public.budget_sales_targets(year);

alter table public.budget_sales_targets enable row level security;
drop policy if exists bst_all on public.budget_sales_targets;
create policy bst_all on public.budget_sales_targets for all to authenticated
  using (public.is_accountant_or_admin()) with check (public.is_accountant_or_admin());

-- ============================================================================
-- 끝.
-- ============================================================================
