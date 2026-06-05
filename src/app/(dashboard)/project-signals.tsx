"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, ChevronDown, Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

type Task = { id: string; title: string; done: boolean }
type Proj = {
  id: string
  name: string
  status_light: string
  progress: number
  tasks: Task[]
}

const LIGHT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
}

export function ProjectSignals({ projects }: { projects: Proj[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  if (projects.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">진행 중인 프로젝트가 없습니다.</p>
  }

  return (
    <ul className="space-y-1.5">
      {projects.map((p) => {
        const isOpen = open.has(p.id)
        const doneCount = p.tasks.filter((t) => t.done).length
        return (
          <li key={p.id} className="overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className={cn("size-2.5 shrink-0 rounded-full", LIGHT[p.status_light])} />
              <Link
                href={`/projects/${p.id}`}
                className="flex-1 truncate text-sm font-medium hover:text-primary"
              >
                {p.name}
              </Link>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{p.progress}%</span>
              {p.tasks.length > 0 ? (
                <button
                  onClick={() => toggle(p.id)}
                  className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  title="세부 업무 보기"
                >
                  <span className="tabular-nums">
                    {doneCount}/{p.tasks.length}
                  </span>
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : (
                <span className="shrink-0 text-[10px] text-muted-foreground">업무 없음</span>
              )}
            </div>
            {isOpen && p.tasks.length > 0 && (
              <ul className="space-y-1 border-t bg-muted/20 px-3 py-2">
                {p.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    {t.done ? (
                      <Check className="size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="size-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className={cn("truncate", t.done && "text-muted-foreground line-through")}>
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
