import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16: 'middleware' 컨벤션이 'proxy'로 변경됨.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에 적용:
     * - api/cron (Cron 엔드포인트 — 자체 CRON_SECRET 인증, 세션 리다이렉트 금지)
     * - _next/static, _next/image (정적 파일)
     * - favicon, 이미지 등 정적 자원
     */
    "/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
