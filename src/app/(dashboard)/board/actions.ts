"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"
import { notify } from "@/lib/notify"

export type BoardState = { ok: true; id: string } | { ok: false; error: string } | undefined
export type SimpleState = { ok: true } | { ok: false; error: string } | undefined

export interface PostInput {
  category: string
  title: string
  body: string
  is_pinned?: boolean
  is_required?: boolean
  is_popup?: boolean
  publish_at?: string | null
}

const CATEGORIES = ["공지", "자유", "건의"]

export async function createPost(input: PostInput): Promise<BoardState> {
  const me = await getCurrentEmployee()
  const category = CATEGORIES.includes(input.category) ? input.category : "자유"
  if (!input.title.trim()) return { ok: false, error: "제목을 입력하세요." }
  if (category === "공지" && me.role !== "admin")
    return { ok: false, error: "공지는 관리자만 작성할 수 있습니다." }

  const isNotice = category === "공지"
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("board_posts")
    .insert({
      category,
      title: input.title.trim(),
      body: input.body || null,
      author_id: me.id,
      is_pinned: isNotice ? !!input.is_pinned : false,
      is_required: isNotice ? !!input.is_required : false,
      is_popup: isNotice ? !!input.is_popup : false,
      publish_at: input.publish_at || null,
    })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: `저장 실패: ${error?.message}` }

  // 공지 필독이면 전 직원에게 알림
  if (isNotice && input.is_required) {
    const admin = createAdminClient()
    const { data: emps } = await admin
      .from("employees")
      .select("id")
      .neq("status", "퇴사")
      .neq("id", me.id)
    await notify(
      (emps ?? []).map((e) => e.id as string),
      { type: "notice", title: "[필독 공지] " + input.title.trim(), link: `/board/${data.id}` }
    )
  }
  revalidatePath("/board")
  return { ok: true, id: data.id as string }
}

export async function updatePost(id: string, input: PostInput): Promise<SimpleState> {
  const me = await getCurrentEmployee()
  if (!input.title.trim()) return { ok: false, error: "제목을 입력하세요." }
  const category = CATEGORIES.includes(input.category) ? input.category : "자유"
  if (category === "공지" && me.role !== "admin")
    return { ok: false, error: "공지는 관리자만 작성할 수 있습니다." }
  const isNotice = category === "공지"
  const supabase = await createClient()
  const { error } = await supabase
    .from("board_posts")
    .update({
      category,
      title: input.title.trim(),
      body: input.body || null,
      is_pinned: isNotice ? !!input.is_pinned : false,
      is_required: isNotice ? !!input.is_required : false,
      is_popup: isNotice ? !!input.is_popup : false,
      publish_at: input.publish_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  revalidatePath("/board")
  revalidatePath(`/board/${id}`)
  return { ok: true }
}

export async function deletePost(id: string): Promise<SimpleState> {
  await getCurrentEmployee()
  const supabase = await createClient()
  const { error } = await supabase.from("board_posts").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/board")
  return { ok: true }
}

export async function addComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<SimpleState> {
  const me = await getCurrentEmployee()
  if (!content.trim()) return { ok: false, error: "내용을 입력하세요." }
  const supabase = await createClient()
  const { error } = await supabase.from("board_comments").insert({
    post_id: postId,
    author_id: me.id,
    parent_comment_id: parentId || null,
    content: content.trim(),
  })
  if (error) return { ok: false, error: `등록 실패: ${error.message}` }

  // 글 작성자에게 알림(본인 제외)
  const admin = createAdminClient()
  const { data: post } = await admin
    .from("board_posts")
    .select("author_id, title, category")
    .eq("id", postId)
    .single()
  if (post && post.author_id !== me.id && post.category !== "건의") {
    await notify([post.author_id as string], {
      type: "comment",
      title: "게시글에 새 댓글",
      message: `${me.name}님이 댓글을 남겼습니다.`,
      link: `/board/${postId}`,
    })
  }
  revalidatePath(`/board/${postId}`)
  return { ok: true }
}

export async function deleteComment(id: string, postId: string): Promise<SimpleState> {
  await getCurrentEmployee()
  const supabase = await createClient()
  const { error } = await supabase.from("board_comments").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/board/${postId}`)
  return { ok: true }
}

export async function toggleReaction(postId: string, emoji: string): Promise<SimpleState> {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("board_reactions")
    .select("emoji")
    .eq("post_id", postId)
    .eq("employee_id", me.id)
    .eq("emoji", emoji)
    .maybeSingle()
  if (existing) {
    await supabase
      .from("board_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("employee_id", me.id)
      .eq("emoji", emoji)
  } else {
    await supabase
      .from("board_reactions")
      .insert({ post_id: postId, employee_id: me.id, emoji })
  }
  revalidatePath(`/board/${postId}`)
  return { ok: true }
}

/** 공지 읽음 처리 (조회 시 호출). */
export async function markRead(postId: string): Promise<void> {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  await supabase
    .from("board_reads")
    .upsert({ post_id: postId, employee_id: me.id, read_at: new Date().toISOString() })
}

/** 팝업 공지 다시 보지 않기. */
export async function dismissPopup(postId: string, scope: "today" | "forever"): Promise<void> {
  const me = await getCurrentEmployee()
  const supabase = await createClient()
  await supabase
    .from("board_popup_dismissals")
    .upsert({ post_id: postId, employee_id: me.id, scope, created_at: new Date().toISOString() })
}
