"use client"

import { useState } from "react"
import Link from "next/link"
import DOMPurify from "isomorphic-dompurify"
import { dismissPopup } from "@/app/(dashboard)/board/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type PopupNotice = { id: string; title: string; body: string | null }

export function NoticePopup({ notices }: { notices: PopupNotice[] }) {
  const [open, setOpen] = useState(notices.length > 0)

  if (notices.length === 0) return null

  async function dismissAll(scope: "today" | "forever") {
    await Promise.all(notices.map((n) => dismissPopup(n.id, scope)))
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>📢 공지사항</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {notices.map((n) => (
            <div key={n.id} className="rounded-lg border bg-card p-4">
              <Link
                href={`/board/${n.id}`}
                className="font-semibold hover:underline"
                onClick={() => setOpen(false)}
              >
                {n.title}
              </Link>
              {n.body && (
                <div
                  className="rich-content mt-2 max-h-48 overflow-hidden text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.body) }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="-mx-4 -mb-4 mt-1 flex flex-wrap justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-3">
          <Button variant="ghost" size="sm" onClick={() => dismissAll("today")}>
            오늘 하루 보지 않기
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dismissAll("forever")}>
            다시 보지 않기
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
