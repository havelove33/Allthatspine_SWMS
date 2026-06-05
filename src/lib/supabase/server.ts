import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * 서버(서버 컴포넌트 / 서버 액션 / Route Handler)용 Supabase 클라이언트.
 * 쿠키 기반 세션을 읽고 갱신한다.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서 호출된 경우 무시 가능 (미들웨어가 세션 갱신 담당)
          }
        },
      },
    }
  )
}

/**
 * 관리자 전용 서비스 롤 클라이언트.
 * service_role 키 사용 — RLS를 우회하므로 서버에서만, 신중히 사용.
 * (예: 관리자의 직원 계정 생성)
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
