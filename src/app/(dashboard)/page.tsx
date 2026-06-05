import { getCurrentEmployee, isAdmin, canAccessBudget } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getKstDateString } from "@/lib/attendance"
import Image from "next/image"
import { NoticePopup } from "@/components/dashboard/notice-popup"
import { AdminBoard } from "./admin-board"
import { EmployeeBoard } from "./employee-board"
import { BudgetMiniWidget } from "./budget-widget"

export default async function DashboardPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)

  // 로그인 팝업 공지
  const supabase = await createClient()
  const nowIso = new Date().toISOString()
  const [{ data: noticeData }, { data: dismissals }] = await Promise.all([
    supabase
      .from("board_posts")
      .select("id, title, body, publish_at")
      .eq("category", "공지")
      .eq("is_popup", true)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("board_popup_dismissals")
      .select("post_id, scope, created_at")
      .eq("employee_id", me.id),
  ])
  const today = getKstDateString(new Date())
  const dForever = new Set(
    (dismissals ?? []).filter((d) => d.scope === "forever").map((d) => d.post_id)
  )
  const dToday = new Set(
    (dismissals ?? [])
      .filter((d) => d.scope === "today" && getKstDateString(new Date(d.created_at)) === today)
      .map((d) => d.post_id)
  )
  const popupNotices = (
    (noticeData ?? []) as { id: string; title: string; body: string | null; publish_at: string | null }[]
  )
    .filter(
      (n) => (!n.publish_at || n.publish_at <= nowIso) && !dForever.has(n.id) && !dToday.has(n.id)
    )
    .map((n) => ({ id: n.id, title: n.title, body: n.body }))

  return (
    <div>
      <NoticePopup notices={popupNotices} />
      {/* 히어로 — 인사말 + 흰 바탕 패턴 배경 (전체 배경) */}
      <div className="relative mb-6 overflow-hidden rounded-xl border bg-card px-5 py-6">
        <Image
          src="/hero-banner-v2.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover"
        />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">안녕하세요, {me.name}님</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {admin ? "전사 현황 상황판" : "내 업무 현황"}
          </p>
        </div>
      </div>

      {admin ? (
        <AdminBoard />
      ) : (
        <div className="space-y-4">
          <EmployeeBoard me={me} />
          {canAccessBudget(me) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <BudgetMiniWidget />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
