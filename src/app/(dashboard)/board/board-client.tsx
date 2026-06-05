"use client"

import { useState } from "react"
import Link from "next/link"
import { Pin, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Row = {
  id: string
  category: string
  title: string
  authorName: string
  is_pinned: boolean
  is_required: boolean
  scheduled: boolean
  created_at: string
  commentCount: number
}

const TABS = ["전체", "공지", "자유", "건의"]
const CAT_STYLE: Record<string, string> = {
  공지: "bg-primary/15 text-primary",
  자유: "bg-muted text-foreground",
  건의: "bg-amber-100 text-amber-700",
}

export function BoardList({ rows }: { rows: Row[] }) {
  const [tab, setTab] = useState("전체")
  const filtered = tab === "전체" ? rows : rows.filter((r) => r.category === tab)

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/board/${r.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30"
          >
            {r.is_pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
            <Badge variant="secondary" className={cn("shrink-0 text-[10px]", CAT_STYLE[r.category])}>
              {r.category}
            </Badge>
            <span className="flex-1 truncate font-medium">
              {r.title}
              {r.is_required && <span className="ml-1 text-xs text-red-600">[필독]</span>}
              {r.scheduled && <span className="ml-1 text-xs text-muted-foreground">(예약)</span>}
            </span>
            {r.commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" />
                {r.commentCount}
              </span>
            )}
            <span className="hidden w-20 shrink-0 truncate text-right text-xs text-muted-foreground sm:block">
              {r.authorName}
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {r.created_at.slice(5, 10).replace("-", ".")}
            </span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">게시글이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
