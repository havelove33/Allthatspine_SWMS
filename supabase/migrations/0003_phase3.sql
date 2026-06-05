-- ============================================================================
-- 올댓스파인 업무관리 시스템 — Phase 3: 게시판 · 자료공유 · 캘린더 · 전자결재
-- 철학: 보조 모듈. 가볍게. 모든 테이블 RLS 활성화.
-- 사용법: Supabase SQL Editor 또는 Management API. 재실행 안전(idempotent).
-- ============================================================================

-- ─────────────────────────────────────────────
-- 게시판 (공지 + 자유 + 익명 건의)
-- ─────────────────────────────────────────────
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null default '자유',        -- 공지 / 자유 / 건의(익명)
  title text not null,
  body text,                                     -- 리치 HTML (DOMPurify 정화)
  author_id uuid not null references public.employees(id) on delete cascade,
  is_pinned boolean not null default false,      -- 상단 고정
  is_required boolean not null default false,    -- 필독(공지)
  is_popup boolean not null default false,       -- 로그인 시 팝업(공지)
  publish_at timestamptz,                        -- 예약 발행(미래면 미게시)
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references public.employees(id) on delete cascade,
  parent_comment_id uuid references public.board_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.board_reads (
  post_id uuid references public.board_posts(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (post_id, employee_id)
);

create table if not exists public.board_reactions (
  post_id uuid references public.board_posts(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  emoji text not null,
  primary key (post_id, employee_id, emoji)
);

create table if not exists public.board_popup_dismissals (
  post_id uuid references public.board_posts(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  scope text not null,                           -- today / forever
  created_at timestamptz not null default now(),
  primary key (post_id, employee_id)
);

create index if not exists idx_board_posts_created on public.board_posts(created_at desc);
create index if not exists idx_board_comments_post on public.board_comments(post_id);

-- ─────────────────────────────────────────────
-- 자료공유
-- ─────────────────────────────────────────────
create table if not exists public.file_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.file_folders(id) on delete cascade,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.file_folders(id) on delete set null,
  name text not null,
  storage_path text,                             -- Storage(files 버킷) 경로
  external_url text,                             -- 외부 링크(대용량)
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'all',        -- all / restricted
  uploaded_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.file_grants (
  file_id uuid references public.shared_files(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  primary key (file_id, employee_id)
);

create index if not exists idx_shared_files_folder on public.shared_files(folder_id);

-- ─────────────────────────────────────────────
-- 캘린더 (직접 등록 이벤트 — 타 모듈 날짜는 조회 시 합성)
-- ─────────────────────────────────────────────
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'personal',   -- personal/company/project/meeting
  start_date date not null,
  end_date date,
  all_day boolean not null default true,
  start_time time,
  end_time time,
  owner_id uuid references public.employees(id) on delete cascade,
  visibility text not null default 'shared',      -- private / shared
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_start on public.calendar_events(start_date);

-- ─────────────────────────────────────────────
-- 전자결재 (간단 신청 → 승인)
-- ─────────────────────────────────────────────
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,                        -- leave/expense/purchase/general
  title text not null,
  content jsonb not null default '{}',            -- 양식별 필드값
  applicant_id uuid not null references public.employees(id) on delete cascade,
  approver_id uuid references public.employees(id) on delete set null,
  status text not null default '대기',            -- 대기/승인/반려/회수
  reject_reason text,
  attachment_path text,
  linked_leave_id uuid references public.leaves(id) on delete set null,
  decided_by uuid references public.employees(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_comments (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid references public.approvals(id) on delete cascade,
  author_id uuid references public.employees(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_approvals_applicant on public.approvals(applicant_id);
create index if not exists idx_approvals_status on public.approvals(status);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.board_posts            enable row level security;
alter table public.board_comments         enable row level security;
alter table public.board_reads            enable row level security;
alter table public.board_reactions        enable row level security;
alter table public.board_popup_dismissals enable row level security;
alter table public.file_folders           enable row level security;
alter table public.shared_files           enable row level security;
alter table public.file_grants            enable row level security;
alter table public.calendar_events        enable row level security;
alter table public.approvals              enable row level security;
alter table public.approval_comments      enable row level security;

-- board_posts: 건의(익명)는 작성자/관리자만, 그 외 전 직원 조회. 작성=본인, 수정/삭제=작성자/관리자
drop policy if exists bp_select on public.board_posts;
drop policy if exists bp_insert on public.board_posts;
drop policy if exists bp_update on public.board_posts;
drop policy if exists bp_delete on public.board_posts;
create policy bp_select on public.board_posts for select to authenticated
  using (category <> '건의' or author_id = auth.uid() or public.is_admin());
create policy bp_insert on public.board_posts for insert to authenticated
  with check (author_id = auth.uid());
create policy bp_update on public.board_posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy bp_delete on public.board_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- board_comments
drop policy if exists bc_select on public.board_comments;
drop policy if exists bc_insert on public.board_comments;
drop policy if exists bc_modify on public.board_comments;
create policy bc_select on public.board_comments for select to authenticated using (true);
create policy bc_insert on public.board_comments for insert to authenticated
  with check (author_id = auth.uid());
create policy bc_modify on public.board_comments for all to authenticated
  using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());

-- board_reads (읽음현황은 관리자도 조회)
drop policy if exists br_select on public.board_reads;
drop policy if exists br_write on public.board_reads;
create policy br_select on public.board_reads for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());
create policy br_write on public.board_reads for all to authenticated
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());

-- board_reactions
drop policy if exists brx_select on public.board_reactions;
drop policy if exists brx_write on public.board_reactions;
create policy brx_select on public.board_reactions for select to authenticated using (true);
create policy brx_write on public.board_reactions for all to authenticated
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());

-- board_popup_dismissals
drop policy if exists bpd_all on public.board_popup_dismissals;
create policy bpd_all on public.board_popup_dismissals for all to authenticated
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());

-- file_folders: 전 직원 조회, 관리는 관리자
drop policy if exists ff_select on public.file_folders;
drop policy if exists ff_admin on public.file_folders;
create policy ff_select on public.file_folders for select to authenticated using (true);
create policy ff_admin on public.file_folders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- shared_files: 전체공개 또는 업로더/관리자/허용대상만 조회. 업로더 본인 업로드, 업로더/관리자 수정·삭제
drop policy if exists sf_select on public.shared_files;
drop policy if exists sf_insert on public.shared_files;
drop policy if exists sf_modify on public.shared_files;
create policy sf_select on public.shared_files for select to authenticated
  using (
    visibility = 'all' or uploaded_by = auth.uid() or public.is_admin()
    or exists (select 1 from public.file_grants g where g.file_id = id and g.employee_id = auth.uid())
  );
create policy sf_insert on public.shared_files for insert to authenticated
  with check (uploaded_by = auth.uid());
create policy sf_modify on public.shared_files for all to authenticated
  using (uploaded_by = auth.uid() or public.is_admin()) with check (uploaded_by = auth.uid() or public.is_admin());

-- file_grants
drop policy if exists fg_select on public.file_grants;
drop policy if exists fg_write on public.file_grants;
create policy fg_select on public.file_grants for select to authenticated using (true);
create policy fg_write on public.file_grants for all to authenticated
  using (exists (select 1 from public.shared_files f where f.id = file_id and (f.uploaded_by = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.shared_files f where f.id = file_id and (f.uploaded_by = auth.uid() or public.is_admin())));

-- calendar_events: 공유 또는 본인/관리자. 쓰기=소유자/관리자
drop policy if exists ce_select on public.calendar_events;
drop policy if exists ce_write on public.calendar_events;
create policy ce_select on public.calendar_events for select to authenticated
  using (visibility = 'shared' or owner_id = auth.uid() or public.is_admin());
create policy ce_write on public.calendar_events for all to authenticated
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

-- approvals: 신청자/결재자/관리자만 조회. 신청=본인. 수정=신청자/결재자/관리자(앱에서 상태 가드)
drop policy if exists ap_select on public.approvals;
drop policy if exists ap_insert on public.approvals;
drop policy if exists ap_update on public.approvals;
create policy ap_select on public.approvals for select to authenticated
  using (applicant_id = auth.uid() or approver_id = auth.uid() or public.is_admin());
create policy ap_insert on public.approvals for insert to authenticated
  with check (applicant_id = auth.uid());
create policy ap_update on public.approvals for update to authenticated
  using (applicant_id = auth.uid() or approver_id = auth.uid() or public.is_admin())
  with check (applicant_id = auth.uid() or approver_id = auth.uid() or public.is_admin());

-- approval_comments: 해당 결재 접근 가능자만
drop policy if exists apc_select on public.approval_comments;
drop policy if exists apc_insert on public.approval_comments;
create policy apc_select on public.approval_comments for select to authenticated
  using (exists (select 1 from public.approvals a where a.id = approval_id
    and (a.applicant_id = auth.uid() or a.approver_id = auth.uid() or public.is_admin())));
create policy apc_insert on public.approval_comments for insert to authenticated
  with check (author_id = auth.uid());

-- ============================================================================
-- 끝.
-- ============================================================================
