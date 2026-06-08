-- 0006_flexible_work.sql
-- 탄력근무제 직원 플래그.
-- true면 지각/조기퇴근 집계에서 제외한다(출퇴근 기록과 일일 근무시간은 정상 집계).
-- 판정 제외는 체크인/체크아웃 서버 액션에서 처리하므로, 기존 통계 쿼리는 수정 불필요.

alter table public.employees
  add column if not exists flexible_work boolean not null default false;

comment on column public.employees.flexible_work is
  '탄력근무제 — true면 지각/조기퇴근 집계 제외(출퇴근 기록·근무시간은 정상 집계)';
