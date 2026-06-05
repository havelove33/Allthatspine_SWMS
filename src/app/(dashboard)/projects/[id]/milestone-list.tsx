"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Plus, Trash2, Flag } from "lucide-react"
import { addMilestone, toggleMilestone, deleteMilestone } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface MilestoneItem {
  id: string
  title: string
  date: string | null
  done: boolean
}

export function MilestoneList({
  projectId,
  milestones,
  isAdmin,
  today,
}: {
  projectId: string
  milestones: MilestoneItem[]
  isAdmin: boolean
  today: string
}) {
  const [busy, setBusy] = useState(false)

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const title = String(fd.get("title") ?? "")
    if (!title.trim()) return
    setBusy(true)
    const res = await addMilestone(projectId, title, String(fd.get("date") ?? "") || undefined)
    setBusy(false)
    if (res?.ok) form.reset()
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3 font-semibold">마일스톤</div>
      <div className="divide-y">
        {milestones.map((m) => {
          const overdue = !m.done && m.date && m.date < today
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={m.done}
                disabled={!isAdmin}
                onChange={async (e) => {
                  const res = await toggleMilestone(m.id, projectId, e.target.checked)
                  if (res && !res.ok) toast.error(res.error)
                }}
                className="size-4"
              />
              <Flag className={cn("size-4 shrink-0", m.done ? "text-emerald-500" : overdue ? "text-red-500" : "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm", m.done && "text-muted-foreground line-through")}>{m.title}</p>
                {m.date && (
                  <p className={cn("text-xs", overdue ? "text-red-500" : "text-muted-foreground")}>
                    {m.date}
                    {overdue ? " · 지연" : ""}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={async () => {
                    const res = await deleteMilestone(m.id, projectId)
                    if (res && !res.ok) toast.error(res.error)
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          )
        })}
        {milestones.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">마일스톤이 없습니다.</p>
        )}
      </div>
      {isAdmin && (
        <form onSubmit={onAdd} className="flex flex-wrap gap-2 border-t p-3">
          <Input name="title" placeholder="마일스톤명 (예: 1차 오픈)" className="min-w-[160px] flex-1" />
          <Input name="date" type="date" className="w-40" />
          <Button type="submit" size="sm" disabled={busy}>
            <Plus className="size-4" />
            추가
          </Button>
        </form>
      )}
    </div>
  )
}
