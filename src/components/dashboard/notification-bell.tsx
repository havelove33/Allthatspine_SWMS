"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/(dashboard)/notify-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AppNotification } from "@/types"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)

  async function refresh() {
    try {
      const r = await getMyNotifications()
      setItems(r.items)
      setUnread(r.unread)
    } catch {
      // 무시
    }
  }

  useEffect(() => {
    let active = true
    async function run() {
      try {
        const r = await getMyNotifications()
        if (!active) return
        setItems(r.items)
        setUnread(r.unread)
      } catch {
        // 무시 (다음 폴링에서 재시도)
      }
    }
    run()
    const id = setInterval(run, 60000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  async function onMarkAll() {
    await markAllNotificationsRead()
    refresh()
  }

  async function onItemClick(n: AppNotification) {
    if (!n.is_read) {
      await markNotificationRead(n.id)
      refresh()
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="알림"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">알림</span>
              {unread > 0 && (
                <button
                  onClick={onMarkAll}
                  className="text-xs text-primary hover:underline"
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  알림이 없습니다.
                </p>
              )}
              {items.map((n) => {
                const inner = (
                  <div
                    className={cn(
                      "flex gap-2 border-b px-3 py-2.5 text-sm last:border-0 hover:bg-muted/50",
                      !n.is_read && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.is_read ? "bg-transparent" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{n.title}</p>
                      {n.message && (
                        <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                      )}
                    </div>
                  </div>
                )
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => onItemClick(n)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} role="button" onClick={() => onItemClick(n)}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
