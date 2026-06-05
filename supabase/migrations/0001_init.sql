-- ============================================================================
-- 올댓스파인 업무관리 시스템 — Phase 1 (MVP) 스키마
-- 대상: 인사정보 · 근태 · 업무보고 · 미션 + 프로젝트(태그)
-- 사용법: Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 실행.
-- ============================================================================

-- ─────────────────────────────────────────────
-- 1. 직원 / 인사정보
-- ─────────────────────────────────────────────
create table if not exists public.employees (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_no text unique,
  name text not null,
  email text not null,
  phone text,
  profile_image_url text,
  hire_date date,
  status text not null default '재직',            -- 재직 / 휴직 / 퇴사
  position text,                                   -- 직급
  employment_type text,                            -- 정규 / 계약 / 인턴
  department_id uuid,                              -- 확장용 (현재 미사용)
  role text not null default 'employee',           -- employee / accountant / manager / admin
  annual_leave_total numeric not null default 0,   -- 연차 총 부여 (관리자 수동 입력)
  annual_leave_used  numeric not null default 0,   -- 사용 연차
  must_change_password boolean not null default true, -- 최초 로그인 시 비밀번호 변경 유도
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 권한 헬퍼 함수 (security definer = RLS 우회하여 재귀 방지)
create or replace function public.current_user_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.employees where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.employees where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_accountant_or_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.employees where id = auth.uid() and role in ('accountant','admin'))
$$;

-- ─────────────────────────────────────────────
-- 2. 근무 규칙 (단일 행) / 사무실 QR
-- ─────────────────────────────────────────────
create table if not exists public.company_settings (
  id int primary key default 1,
  work_start_time time not null default '09:00',
  work_end_time   time not null default '18:00',
  late_grace_minutes int not null default 0,       -- 지각 인정 유예(분)
  allowed_ip_ranges jsonb not null default '[]',   -- ["192.168.101.0/24", ...]
  report_deadline_time time not null default '18:00',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

create table if not exists public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  location_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3. 근태 기록 / 정정 요청 / 휴가
-- ─────────────────────────────────────────────
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in_at  timestamptz,
  check_out_at timestamptz,
  work_minutes int,
  check_in_ip  text,
  check_out_ip text,
  check_in_method text,                            -- 'ip+qr'
  device_info text,
  status text not null default '정상',             -- 정상/지각/조기퇴근/결근/휴가
  is_late boolean not null default false,
  is_early_leave boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  request_type text,                               -- 출근정정/퇴근정정/누락
  requested_time timestamptz,
  reason text not null,
  status text not null default '대기',             -- 대기/승인/반려
  reviewed_by uuid references public.employees(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,                        -- 연차/오전반차/오후반차/병가/경조사/공가/무급
  start_date date not null,
  end_date date not null,
  days numeric not null,
  reason text,
  status text not null default '대기',             -- 대기/승인/반려
  approved_by uuid references public.employees(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 4. 프로젝트 (태그를 1단계부터 사용)
-- ─────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag  text unique,                                -- 업무보고 태그 키
  overview text,                                   -- 개요 (리치텍스트)
  status text not null default '진행중',
  status_light text not null default 'green',      -- green/yellow/red
  parent_project_id uuid references public.projects(id),
  progress int not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 5. 업무보고 (동적 템플릿)
-- ─────────────────────────────────────────────
create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,                       -- daily/weekly/monthly
  fields jsonb not null,                           -- [{key,label,type,required,options}]
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  report_type text not null,                       -- daily/weekly/monthly
  report_date date,
  period_start date,
  period_end date,
  content jsonb not null default '{}',
  status text not null default '제출',             -- 임시저장/제출
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.report_project_links (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  hours numeric not null default 0
);

create table if not exists public.report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  author_id uuid not null references public.employees(id) on delete cascade,
  parent_comment_id uuid references public.report_comments(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 6. 미션 (목표관리)
-- ─────────────────────────────────────────────
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  period_type text not null,                       -- weekly/monthly
  period_start date,
  period_end date,
  title text not null,
  target_metric text,
  achievement_criteria text,
  priority text not null default '중',             -- 상/중/하
  progress int not null default 0,
  status text not null default '작성',             -- 작성/승인/진행/완료
  created_by uuid references public.employees(id),
  approved_by uuid references public.employees(id),
  self_evaluation text,
  manager_evaluation text,
  result text,                                     -- 달성/미달/초과
  created_at timestamptz not null default now()
);

create table if not exists public.report_missions (
  report_id uuid references public.reports(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete cascade,
  primary key (report_id, mission_id)
);

-- ─────────────────────────────────────────────
-- 7. 알림
-- ─────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.employees(id) on delete cascade,
  type text,
  title text,
  message text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- RLS (Row Level Security) 활성화 + 정책
-- 원칙: SELECT는 본인/인증된 직원, 쓰기는 본인 또는 관리자.
--      근태 체크인·알림 생성 등 신뢰가 필요한 쓰기는 서버(서비스롤)에서 수행.
-- ============================================================================
alter table public.employees             enable row level security;
alter table public.company_settings      enable row level security;
alter table public.qr_tokens             enable row level security;
alter table public.attendance            enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.leaves                enable row level security;
alter table public.projects              enable row level security;
alter table public.report_templates      enable row level security;
alter table public.reports               enable row level security;
alter table public.report_project_links  enable row level security;
alter table public.report_comments       enable row level security;
alter table public.missions              enable row level security;
alter table public.report_missions       enable row level security;
alter table public.notifications         enable row level security;

-- employees: 인증된 직원은 조회 가능(이름·담당자 표시 필요), 쓰기는 관리자, 본인은 일부 수정
create policy emp_select on public.employees for select to authenticated using (true);
create policy emp_admin_write on public.employees for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy emp_self_update on public.employees for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- company_settings: 조회는 인증 직원, 수정은 관리자
create policy cs_select on public.company_settings for select to authenticated using (true);
create policy cs_admin on public.company_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- qr_tokens: 관리자만 (검증은 서버 서비스롤에서)
create policy qr_admin on public.qr_tokens for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- attendance: 본인/관리자 조회. 직접 쓰기는 관리자만 (체크인은 서버 검증 후 서비스롤로 기록)
create policy att_select on public.attendance for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());
create policy att_admin_write on public.attendance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- attendance_corrections: 본인 신청, 관리자 처리
create policy corr_select on public.attendance_corrections for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());
create policy corr_insert on public.attendance_corrections for insert to authenticated
  with check (employee_id = auth.uid());
create policy corr_admin_update on public.attendance_corrections for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- leaves: 본인 신청/조회, 관리자 승인
create policy leave_select on public.leaves for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());
create policy leave_insert on public.leaves for insert to authenticated
  with check (employee_id = auth.uid());
create policy leave_admin_update on public.leaves for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- projects: 인증 직원 조회, 관리자 관리
create policy proj_select on public.projects for select to authenticated using (true);
create policy proj_admin on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- report_templates: 인증 직원 조회(폼 렌더), 관리자 편집
create policy tpl_select on public.report_templates for select to authenticated using (true);
create policy tpl_admin on public.report_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- reports: 본인 작성/조회, 관리자 전체 조회
create policy rpt_select on public.reports for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());
create policy rpt_own_write on public.reports for all to authenticated
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());

-- report_project_links: 부모 보고서 소유자/관리자
create policy rpl_select on public.report_project_links for select to authenticated using (true);
create policy rpl_write on public.report_project_links for all to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and (r.employee_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.reports r where r.id = report_id and (r.employee_id = auth.uid() or public.is_admin())));

-- report_comments: 인증 직원 조회, 작성자 본인 작성, 작성자/관리자 수정
create policy cmt_select on public.report_comments for select to authenticated using (true);
create policy cmt_insert on public.report_comments for insert to authenticated
  with check (author_id = auth.uid());
create policy cmt_update on public.report_comments for update to authenticated
  using (author_id = auth.uid() or public.is_admin()) with check (true);

-- missions: 본인/관리자 조회, 본인 또는 관리자 작성, 본인/관리자 수정
create policy mis_select on public.missions for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());
create policy mis_insert on public.missions for insert to authenticated
  with check (employee_id = auth.uid() or public.is_admin());
create policy mis_update on public.missions for update to authenticated
  using (employee_id = auth.uid() or public.is_admin())
  with check (employee_id = auth.uid() or public.is_admin());

-- report_missions: 보고서 소유자/관리자
create policy rm_select on public.report_missions for select to authenticated using (true);
create policy rm_write on public.report_missions for all to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and (r.employee_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.reports r where r.id = report_id and (r.employee_id = auth.uid() or public.is_admin())));

-- notifications: 본인 수신분 조회/읽음처리. 생성은 서버(서비스롤).
create policy noti_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy noti_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy noti_admin on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 초기 데이터 (Seed)
-- ============================================================================

-- 근무 규칙: 09:00~18:00, IP 192.168.101.0/24 (※ 배포 후 관리자 페이지에서 공인 IP로 교체)
insert into public.company_settings (id, work_start_time, work_end_time, late_grace_minutes, allowed_ip_ranges, report_deadline_time)
values (1, '09:00', '18:00', 0, '["192.168.101.0/24"]'::jsonb, '18:00')
on conflict (id) do nothing;

-- 기본 일일보고 템플릿
insert into public.report_templates (report_type, fields)
values ('daily', '[
  {"key":"title","label":"업무 제목","type":"text","required":true},
  {"key":"status","label":"진행 상태","type":"select","required":true,"options":["예정","진행중","완료","보류"]},
  {"key":"progress","label":"진행률(%)","type":"number","required":false},
  {"key":"work_done","label":"오늘 한 일","type":"textarea","required":true},
  {"key":"hours","label":"소요 시간(시간)","type":"number","required":true},
  {"key":"issues","label":"이슈·요청사항","type":"textarea","required":false}
]'::jsonb)
on conflict do nothing;

-- 사무실 QR 기본 토큰 (※ 배포 후 관리자 페이지에서 재발급·포스터 출력)
insert into public.qr_tokens (code, location_name, is_active)
values ('ATS-OFFICE-MAIN-0001', '본사', true)
on conflict (code) do nothing;

-- ============================================================================
-- 끝. (Phase 2/3 테이블은 해당 단계에서 추가 마이그레이션으로 작성)
-- ============================================================================
