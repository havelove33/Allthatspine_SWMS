# Supabase 설정 가이드

## 1. 프로젝트 생성 & 키 입력
1. https://supabase.com 에서 새 프로젝트 생성 (Region: **Northeast Asia (Seoul)** 권장)
2. `Project Settings → API` 에서 아래 3개를 복사해 프로젝트 루트 `.env.local` 에 입력:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 노출 금지)

## 2. 스키마 생성
`SQL Editor` 에서 [`migrations/0001_init.sql`](migrations/0001_init.sql) 전체를 붙여넣고 실행.
→ 테이블 + RLS 정책 + 초기값(근무 09:00~18:00, IP 192.168.101.0/24, 기본 보고 템플릿, QR) 생성.

## 3. 첫 관리자(대표) 계정 부트스트랩 ⭐
계정은 "관리자가 생성"하는 구조라, **최초 관리자 1명은 수동 생성**해야 합니다.

1. `Authentication → Users → Add user` 에서 대표 이메일/비밀번호로 사용자 추가
   (Auto Confirm User 체크).
2. 방금 만든 사용자의 **User UID** 복사.
3. `SQL Editor` 에서 아래 실행 (UID·이메일·이름 교체):

```sql
insert into public.employees (id, name, email, role, status, must_change_password)
values (
  '여기에-USER-UID-붙여넣기',
  '대표이름',
  'ceo@allthatspine.com',
  'admin',
  '재직',
  false
);
```

4. 이제 `/login` 에서 그 이메일/비밀번호로 로그인하면 관리자로 접속됩니다.
   이후 직원 계정은 관리자 화면(STEP 1 구현)에서 생성합니다.

## 4. 로컬 실행
```bash
npm run dev
```
→ http://localhost:3000 (미로그인 시 /login 으로 이동)

## 배포(Vercel) 시 주의
- 같은 환경변수 3개를 Vercel Project Settings → Environment Variables 에 등록.
- ⚠️ 허용 IP `192.168.101.0/24` 는 임시값(사설 IP). 배포 후 관리자 설정에서
  **회사 인터넷 공인 IP 대역**으로 교체해야 출퇴근 IP 인증이 작동합니다.
