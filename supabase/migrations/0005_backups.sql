-- ============================================================================
-- 올댓스파인 — DB 백업 메타데이터 (앱 내 백업/복원 시스템)
-- 접근: 관리자만 (RLS is_admin). 실제 백업 파일은 'backups' 비공개 버킷에 저장.
-- ============================================================================

create table if not exists public.db_backups (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  table_counts jsonb not null default '{}',     -- {employees: 10, attendance: 233, ...}
  total_rows int not null default 0,
  kind text not null default 'manual',           -- manual / auto
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_db_backups_created on public.db_backups(created_at desc);

alter table public.db_backups enable row level security;
drop policy if exists dbk_admin on public.db_backups;
create policy dbk_admin on public.db_backups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 끝.
-- ============================================================================
