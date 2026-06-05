# 올댓스파인 스마트 업무관리 시스템 (AllThatSpine SWMS)

> 주식회사 올댓스파인의 **원격 직원 통제 · 프로젝트/예산 모니터링** 웹 애플리케이션.
> 대표가 원격지에서 직원의 근무·업무·목표·예산을 한 화면에서 관리하기 위한 **모니터링·통제 도구**.

**철학:** 무거운 ERP가 아니라 가벼운 모니터링 도구 — *"입력은 최소, 보는 건 충실."*

---

## ✨ 주요 기능

| 모듈 | 목적 |
|------|------|
| **근태관리** | IP + QR 위치 인증으로 원격 출퇴근 통제, 휴가·연차, 월별·연간 통계, 실시간 현황판 |
| **업무보고** | 일/주/월 동적 템플릿 보고, 프로젝트 태그 연계, 미제출 현황 |
| **나의 업무(목표)** | 주/월 목표 설정·진행률 추적, 보고-목표 연계 |
| **프로젝트** | 블로그형 개요·세부업무·마일스톤·신호등 현황 |
| **예산** | 매출 목표 달성률·항목별 추적, 통장 입출금·잔액, 법인카드, 월/연 통계 |
| **게시판 · 자료공유 · 캘린더** | 공지(팝업)·자유·건의, 폴더 자료실, 일정 통합 뷰 |
| **전자결재** | 휴가/지출/구매/기안 신청→승인, **A4 결재문서**(직인·서명) 출력 |
| **대시보드 상황판** | 역할별 KPI·처리 대기함·위젯으로 전사 현황 한눈에 |
| **데이터 백업/복원** | 전 테이블 스냅샷 백업(클라우드+로컬), merge 복원 |

## 🛠 기술 스택

- **Next.js 16 (App Router) · React 19 · TypeScript**
- **Tailwind CSS v4 · shadcn/ui (Base UI)** · Pretendard 폰트
- **Supabase** — PostgreSQL · Auth · Storage · **RLS(행 단위 보안)**
- **Vercel** 배포 · Vercel Cron(자동 백업)
- Recharts(차트) · TipTap(리치에디터) · date-holidays(공휴일)

## 🚀 로컬 실행

```bash
npm install
# .env.local 에 환경변수 설정 (아래)
npm run dev   # http://localhost:3000
```

## 🔑 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # 서버 전용
QR_KIOSK_SECRET=...                  # 출퇴근 QR 회전 토큰
CRON_SECRET=...                      # 자동 백업 Cron 인증
```

> Vercel 배포 시 동일 변수를 Project Settings → Environment Variables 에 등록.

## 🗄 DB 스키마

`supabase/migrations/` 의 SQL 파일을 번호 순서대로 Supabase SQL Editor에서 실행:
`0001_init` → `0002_budget` → `0003_phase3` → `0004_sales_targets` → `0005_backups`.

## 📚 문서

- [기능명세서](docs/01_기능명세서.md) · [개발명세서](docs/02_개발명세서.md)
- [사용자 매뉴얼](docs/03_사용자_매뉴얼.md) · [버전관리](docs/04_버전관리.md)
- [핵심 장점 슬라이드](docs/핵심장점_슬라이드.html)
- [CHANGELOG](CHANGELOG.md)

## 👥 역할(권한)

`employee`(직원) · `accountant`(회계담당) · `manager`(부서장, 확장용) · `admin`(대표) · `kiosk`(출퇴근 단말).
계정은 **관리자가 생성** (셀프 가입 없음).

---

© 2026 주식회사 올댓스파인 (AllThatSpine Co., Ltd.) · v1.0
