"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Trash2, FileText } from "lucide-react"
import { addTask, toggleTask, deleteTask } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface TaskItem {
  id: string
  title: string
  done: boolean
  due_date: string | null
  assigneeName: string | null
  postId: string | null
  postTitle: string | null
}

const SELECT_CLS =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export function TaskList({
  projectId,
  tasks,
  isAdmin,
  employees,
  posts,
}: {
  projectId: string
  tasks: TaskItem[]
  isAdmin: boolean
  employees: { id: string; name: string }[]
  posts: { id: string; title: string }[]
}) {
  const [busy, setBusy] = useState(false)

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const title = String(fd.get("title") ?? "")
    if (!title.trim()) return
    setBusy(true)
    const res = await addTask(
      projectId,
      title,
      String(fd.get("assignee") ?? "") || undefined,
      String(fd.get("due") ?? "") || undefined,
      String(fd.get("post") ?? "") || undefined
    )
    setBusy(false)
    if (res?.ok) form.reset()
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  async function onToggle(id: string, done: boolean) {
    const res = await toggleTask(id, projectId, done)
    if (res && !res.ok) toast.error(res.error)
  }
  async function onDelete(id: string) {
    const res = await deleteTask(id, projectId)
    if (res && !res.ok) toast.error(res.error)
  }

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">세부 업무</span>
        <span className="text-sm text-muted-foreground">
          {doneCount} / {tasks.length} 완료
        </span>
      </div>
      <div className="divide-y">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-start gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              checked={t.done}
              disabled={!isAdmin}
              onChange={(e) => onToggle(t.id, e.target.checked)}
              className="mt-1 size-4"
            />
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", t.done && "text-muted-foreground line-through")}>
                {t.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.assigneeName ? `담당 ${t.assigneeName}` : ""}
                {t.assigneeName && t.due_date ? " · " : ""}
                {t.due_date ? `기한 ${t.due_date}` : ""}
              </p>
              {t.postId && (
                <Link
                  href={`/projects/${projectId}/posts/${t.postId}`}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText className="size-3" />
                  {t.postTitle ?? "연결된 게시글"}
                </Link>
              )}
            </div>
            {isAdmin && (
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(t.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">세부 업무가 없습니다.</p>
        )}
      </div>
      {isAdmin && (
        <form onSubmit={onAdd} className="space-y-2 border-t p-3">
          <div className="flex flex-wrap gap-2">
            <Input name="title" placeholder="업무명" className="min-w-[160px] flex-1" />
            <select name="assignee" className={SELECT_CLS} defaultValue="">
              <option value="">담당자</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <Input name="due" type="date" className="w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select name="post" className={cn(SELECT_CLS, "min-w-[200px] flex-1")} defaultValue="">
              <option value="">연결할 게시글 (선택 — 상세 지시사항)</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={busy}>
              <Plus className="size-4" />
              추가
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
