import Link from "next/link"
import { Plus } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BoardList } from "./board-client"

export default async function BoardPage() {
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()
  const { data } = await supabase
    .from("board_posts")
    .select(
      "id, category, title, author_id, is_pinned, is_required, publish_at, created_at, author:employees!author_id(name), comments:board_comments(count)"
    )
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300)

  const nowIso = new Date().toISOString()
  const rows = (
    (data ?? []) as unknown as {
      id: string
      category: string
      title: string
      author_id: string
      is_pinned: boolean
      is_required: boolean
      publish_at: string | null
      created_at: string
      author: { name: string } | null
      comments: { count: number }[]
    }[]
  )
    .filter((p) => !p.publish_at || p.publish_at <= nowIso || p.author_id === me.id || admin)
    .map((p) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      authorName: p.category === "건의" ? "익명" : p.author?.name ?? "-",
      is_pinned: p.is_pinned,
      is_required: p.is_required,
      scheduled: !!(p.publish_at && p.publish_at > nowIso),
      created_at: p.created_at,
      commentCount: p.comments?.[0]?.count ?? 0,
    }))

  return (
    <div>
      <PageHeader
        title="게시판"
        description="공지사항 · 자유게시판 · 건의"
        action={
          <Link href="/board/new" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            글쓰기
          </Link>
        }
      />
      <BoardList rows={rows} />
    </div>
  )
}
