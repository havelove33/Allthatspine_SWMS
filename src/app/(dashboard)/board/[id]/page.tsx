import { notFound } from "next/navigation"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { PostDetail } from "./post-detail"

export default async function BoardPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("board_posts")
    .select("*, author:employees!author_id(name)")
    .eq("id", id)
    .maybeSingle()
  if (!post) notFound()

  const { data: cData } = await supabase
    .from("board_comments")
    .select("*, author:employees!author_id(name)")
    .eq("post_id", id)
    .order("created_at", { ascending: true })

  const { data: rData } = await supabase
    .from("board_reactions")
    .select("emoji, employee_id")
    .eq("post_id", id)

  const isSuggestion = post.category === "건의"
  const comments = (
    (cData ?? []) as unknown as {
      id: string
      author_id: string
      parent_comment_id: string | null
      content: string
      created_at: string
      author: { name: string } | null
    }[]
  ).map((c) => ({
    id: c.id,
    author_id: c.author_id,
    authorName: c.author?.name ?? "-",
    parent_comment_id: c.parent_comment_id,
    content: c.content,
    created_at: c.created_at,
    canDelete: c.author_id === me.id || admin,
  }))

  // 리액션 집계
  const reactionMap = new Map<string, { count: number; mine: boolean }>()
  for (const r of (rData ?? []) as { emoji: string; employee_id: string }[]) {
    const e = reactionMap.get(r.emoji) ?? { count: 0, mine: false }
    e.count += 1
    if (r.employee_id === me.id) e.mine = true
    reactionMap.set(r.emoji, e)
  }
  const reactions = Array.from(reactionMap.entries()).map(([emoji, v]) => ({ emoji, ...v }))

  // 공지 읽음 현황(관리자)
  let readInfo: { read: number; total: number } | undefined
  if (admin && post.category === "공지") {
    const ac = createAdminClient()
    const [{ count: readCount }, { count: total }] = await Promise.all([
      ac.from("board_reads").select("*", { count: "exact", head: true }).eq("post_id", id),
      ac.from("employees").select("*", { count: "exact", head: true }).neq("status", "퇴사"),
    ])
    readInfo = { read: readCount ?? 0, total: total ?? 0 }
  }

  return (
    <PostDetail
      isAdmin={admin}
      post={{
        id: post.id,
        category: post.category,
        title: post.title,
        body: post.body,
        authorName: isSuggestion ? "익명" : post.author?.name ?? "-",
        author_id: post.author_id,
        is_pinned: post.is_pinned,
        is_required: post.is_required,
        is_popup: post.is_popup,
        publish_at: post.publish_at,
        created_at: post.created_at,
      }}
      canEdit={post.author_id === me.id || admin}
      comments={comments}
      reactions={reactions}
      readInfo={readInfo}
    />
  )
}
