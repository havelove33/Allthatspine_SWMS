"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FORM_LABEL, STATUS_STYLE } from "./labels"

type Row = {
  id: string
  form_type: string
  title: string
  status: string
  created_at: string
  applicantName: string
  mine: boolean
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}

export function ApprovalsList({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const [tab, setTab] = useState<"mine" | "inbox">("mine")
  const inbox = rows.filter((r) => r.status === "대기")
  const mine = rows.filter((r) => r.mine)
  const list = tab === "inbox" ? inbox : mine

  return (
    <div>
      <div className="mb-3 flex gap-1">
        <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>
          내 신청{mine.length > 0 ? ` (${mine.length})` : ""}
        </TabBtn>
        {isAdmin && (
          <TabBtn active={tab === "inbox"} onClick={() => setTab("inbox")}>
            결재함{inbox.length > 0 ? ` (${inbox.length})` : ""}
          </TabBtn>
        )}
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {list.map((r) => (
          <Link
            key={r.id}
            href={`/approvals/${r.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30"
          >
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {FORM_LABEL[r.form_type] ?? r.form_type}
            </Badge>
            <span className="flex-1 truncate font-medium">{r.title}</span>
            {tab === "inbox" && (
              <span className="hidden text-xs text-muted-foreground sm:block">{r.applicantName}</span>
            )}
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px]", STATUS_STYLE[r.status])}>
              {r.status}
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {r.created_at.slice(5, 10).replace("-", ".")}
            </span>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {tab === "inbox" ? "결재 대기 문서가 없습니다." : "신청한 문서가 없습니다."}
          </p>
        )}
      </div>
    </div>
  )
}
