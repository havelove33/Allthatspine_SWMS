@AGENTS.md

# 올댓스파인 업무관리 시스템

주식회사 올댓스파인(allthatspine.com)의 **원격 직원 통제 + 프로젝트/예산 모니터링** 웹앱.
대표가 원격지에서 직원 근무·업무·목표를 관리하기 위한 도구.

> ⚠️ 철학: **무거운 ERP가 아니라 "모니터링·통제 도구"**. 회계·급여·인사평가·풀 결재엔진 등은
> 의도적으로 제외. 원칙 = "입력은 최소, 보는 건 충실". 기능을 늘리기 전에 이 철학을 먼저 확인.

상위 기획/설계 문서는 프로젝트 상위 폴더의 `01_기능명세서.md`, `02_개발명세서.md` 참고.

## 기술 스택
- **Next.js 16 (App Router) + React 19 + TypeScript** — 최신 버전이라 `AGENTS.md` 경고대로 관례 확인 필수
- **Tailwind CSS v4 + shadcn/ui** (모던 대시보드)
- **Supabase**: Postgres + Auth + Storage + Realtime + **RLS**
- **Zod 4** (스키마 검증), React Hook Form, Recharts(차트)
- 배포: GitHub(private) → **Vercel**

## 핵심 규칙 (반드시 지킬 것)
1. **신뢰가 필요한 로직은 서버에서만** (서버 액션/Route Handler). 출퇴근 IP·QR 검증, 권한 판정은 클라이언트 값 신뢰 금지.
2. **시간 기록은 서버 시각**. 클라이언트 시간 사용 금지. 시간대는 KST(UTC+9) — `lib/attendance.ts`의 헬퍼 사용.
3. **전 테이블 RLS 활성화**. 새 테이블 추가 시 정책도 함께. 권한 헬퍼: `public.is_admin()`, `public.is_accountant_or_admin()`.
4. **근태 체크인·알림 생성**처럼 RLS로 막은 쓰기는 서버에서 `createAdminClient()`(service_role)로 수행하되, **반드시 서버 검증 후**에.
5. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용. 클라이언트 번들 포함 금지.

## 프로젝트 구조
- `src/lib/supabase/{client,server,middleware}.ts` — Supabase 클라이언트 (브라우저/서버/세션갱신)
- `src/lib/auth.ts` — `getCurrentEmployee()`, `requireRole()` 등 권한 헬퍼
- `src/lib/attendance.ts` — IP CIDR 매칭, 지각/조기퇴근 판정 (순수 함수)
- `src/types/index.ts` — 도메인 타입 (DB 스키마와 일치)
- `src/components/dashboard/` — 사이드바·셸·네비게이션
- `src/app/(auth)/login/` — 로그인
- `src/app/(dashboard)/` — 인증 영역 (레이아웃이 사이드바 적용)
- `supabase/migrations/` — DB 스키마 SQL (Supabase SQL Editor에서 실행)

## 역할 (employees.role)
`employee`(직원) / `accountant`(회계담당) / `manager`(부서장, 확장용) / `admin`(대표).
계정은 **관리자가 생성**(셀프가입 없음) — service_role로 `auth.admin.createUser()`.

## 개발 로드맵 (Phase 1 = MVP)
STEP 0 기반(완료) → STEP 1 인사정보 → STEP 2 근태(IP+QR) → STEP 3 업무보고 → STEP 4 미션 → STEP 5 대시보드/알림.
이후 Phase 2(프로젝트·예산), Phase 3(게시판·자료·캘린더·전자결재).

## 설정 기본값 (시드)
근무 09:00~18:00, 허용 IP `192.168.101.0/24`(임시 — 배포 후 관리자 페이지에서 **공인 IP**로 교체 필요).
※ 사설 IP(192.168.x)는 Vercel 배포 시 매칭 안 됨 — 회사 인터넷 공인 IP로 바꿔야 작동.

## 로컬 실행
`.env.local`에 Supabase 키 입력 후 `npm run dev`. 스키마는 `supabase/migrations/0001_init.sql`을 SQL Editor에서 실행.
