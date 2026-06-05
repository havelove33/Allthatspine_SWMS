"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { getAdminOrThrow, getCurrentEmployee } from "@/lib/auth"

export type PState = { ok: true } | { ok: false; error: string } | undefined

function rv(projectId: string) {
  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/projects")
}

export interface ProjectMetaPatch {
  overview?: string
  status?: string
  status_light?: string
  progress?: number
  start_date?: string
  end_date?: string
  parent_project_id?: string
}

export async function updateProjectMeta(id: string, patch: ProjectMetaPatch): Promise<PState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const data: Record<string, unknown> = {}
  if (patch.overview !== undefined) data.overview = patch.overview
  if (patch.status !== undefined) data.status = patch.status
  if (patch.status_light !== undefined) data.status_light = patch.status_light
  if (patch.progress !== undefined)
    data.progress = Math.max(0, Math.min(100, Math.round(patch.progress)))
  if (patch.start_date !== undefined) data.start_date = patch.start_date || null
  if (patch.end_date !== undefined) data.end_date = patch.end_date || null
  if (patch.parent_project_id !== undefined)
    data.parent_project_id = patch.parent_project_id || null

  const { error } = await admin.from("projects").update(data).eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  rv(id)
  return { ok: true }
}

// ── 세부 업무 ──
export async function addTask(
  projectId: string,
  title: string,
  assigneeId?: string,
  dueDate?: string,
  postId?: string
): Promise<PState> {
  await getAdminOrThrow()
  if (!title.trim()) return { ok: false, error: "업무명을 입력하세요." }
  const admin = createAdminClient()
  const { error } = await admin.from("project_tasks").insert({
    project_id: projectId,
    title: title.trim(),
    assignee_id: assigneeId || null,
    due_date: dueDate || null,
    post_id: postId || null,
  })
  if (error) return { ok: false, error: `추가 실패: ${error.message}` }
  rv(projectId)
  return { ok: true }
}

export async function toggleTask(id: string, projectId: string, done: boolean): Promise<PState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("project_tasks").update({ done }).eq("id", id)
  if (error) return { ok: false, error: error.message }
  rv(projectId)
  return { ok: true }
}

export async function deleteTask(id: string, projectId: string): Promise<PState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("project_tasks").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  rv(projectId)
  return { ok: true }
}

// ── 마일스톤 ──
export async function addMilestone(
  projectId: string,
  title: string,
  date?: string
): Promise<PState> {
  await getAdminOrThrow()
  if (!title.trim()) return { ok: false, error: "마일스톤명을 입력하세요." }
  const admin = createAdminClient()
  const { error } = await admin.from("project_milestones").insert({
    project_id: projectId,
    title: title.trim(),
    date: date || null,
  })
  if (error) return { ok: false, error: `추가 실패: ${error.message}` }
  rv(projectId)
  return { ok: true }
}

export async function toggleMilestone(
  id: string,
  projectId: string,
  done: boolean
): Promise<PState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("project_milestones").update({ done }).eq("id", id)
  if (error) return { ok: false, error: error.message }
  rv(projectId)
  return { ok: true }
}

export async function deleteMilestone(id: string, projectId: string): Promise<PState> {
  await getAdminOrThrow()
  const admin = createAdminClient()
  const { error } = await admin.from("project_milestones").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  rv(projectId)
  return { ok: true }
}

// ── 프로젝트 게시판(블로그) ──
export type PostState = { ok: true; id: string } | { ok: false; error: string } | undefined

export async function createPost(
  projectId: string,
  title: string,
  body: string
): Promise<PostState> {
  const me = await getCurrentEmployee()
  if (!title.trim()) return { ok: false, error: "제목을 입력하세요." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_posts")
    .insert({ project_id: projectId, title: title.trim(), body: body || null, author_id: me.id })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: `저장 실패: ${error?.message}` }
  revalidatePath(`/projects/${projectId}`)
  return { ok: true, id: data.id as string }
}

export async function updatePost(
  id: string,
  projectId: string,
  title: string,
  body: string
): Promise<PState> {
  await getCurrentEmployee()
  if (!title.trim()) return { ok: false, error: "제목을 입력하세요." }
  const supabase = await createClient()
  const { error } = await supabase
    .from("project_posts")
    .update({ title: title.trim(), body: body || null, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }
  revalidatePath(`/projects/${projectId}/posts/${id}`)
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function deletePost(id: string, projectId: string): Promise<PState> {
  await getCurrentEmployee()
  const supabase = await createClient()
  const { error } = await supabase.from("project_posts").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}
