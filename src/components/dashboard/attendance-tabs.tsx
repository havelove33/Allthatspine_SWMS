"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/attendance", label: "출퇴근" },
  { href: "/attendance/leave", label: "휴가" },
  { href: "/attendance/corrections", label: "정정 요청" },
  { href: "/attendance/yearly", label: "연간 통계" },
]
const ADMIN_TABS = [
  { href: "/attendance/daily", label: "일별 현황" },
  { href: "/attendance/by-employee", label: "직원별" },
]

export function AttendanceTabs({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const tabs = isAdmin ? [...TABS, ...ADMIN_TABS] : TABS
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
