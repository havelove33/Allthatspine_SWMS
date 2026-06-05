import { performBackup } from "@/lib/backup"

export const maxDuration = 60
export const dynamic = "force-dynamic"

/**
 * Vercel Cron 자동 백업 엔드포인트.
 * Vercel은 CRON_SECRET 환경변수가 있으면 Authorization: Bearer <CRON_SECRET> 헤더를 보냄.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 })
  }
  try {
    const res = await performBackup("auto", null)
    return Response.json({ ok: true, filename: res.filename, totalRows: res.totalRows })
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "backup failed" },
      { status: 500 }
    )
  }
}
