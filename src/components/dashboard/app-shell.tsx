"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { visibleNavItems } from "./nav"
import { Logo } from "@/components/brand/logo"
import { NotificationBell } from "./notification-bell"
import { signOut } from "@/app/(auth)/login/actions"
import { ChangePasswordButton } from "./change-password-dialog"
import type { Employee, Role } from "@/types"

const ROLE_LABEL: Record<Role, string> = {
  employee: "직원",
  accountant: "회계담당",
  manager: "부서장",
  admin: "관리자",
  kiosk: "키오스크",
}

function NavLinks({
  role,
  onNavigate,
}: {
  role: Role
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const items = visibleNavItems(role)

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        const Icon = item.icon
        const inner = (
          <>
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.phase !== 1 && (
              <Badge variant="secondary" className="text-[10px]">
                준비중
              </Badge>
            )}
          </>
        )

        // 준비중(Phase 2/3) 메뉴는 클릭 비활성 — 404 방지
        if (item.phase !== 1) {
          return (
            <div
              key={item.href}
              aria-disabled="true"
              title="준비 중인 기능입니다"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/45"
            >
              {inner}
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}

function UserSection({ employee }: { employee: Employee }) {
  const initial = employee.name?.charAt(0) ?? "?"
  return (
    <div className="flex items-center gap-3 border-t p-3">
      <Avatar className="size-9">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{employee.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ROLE_LABEL[employee.role]}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <ChangePasswordButton />
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            title="로그아웃"
            aria-label="로그아웃"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export function AppShell({
  employee,
  children,
}: {
  employee: Employee
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen w-full">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks role={employee.role} />
        </div>
        <UserSection employee={employee} />
      </aside>

      {/* 메인 영역 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단 헤더 (모바일: 메뉴+로고 / 공통: 알림) */}
        <header className="relative flex h-14 items-center gap-2 border-b bg-card px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="메뉴 열기"
            onClick={() => setOpen(true)}
            className="md:hidden"
          >
            <Menu className="size-5" />
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="flex h-14 items-center border-b px-4">
                <Logo />
              </SheetTitle>
              <div className="flex-1 overflow-y-auto py-3">
                <NavLinks
                  role={employee.role}
                  onNavigate={() => setOpen(false)}
                />
              </div>
              <UserSection employee={employee} />
            </SheetContent>
          </Sheet>
          <Logo className="md:hidden" />
          <div className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
            <span className="text-lg font-bold tracking-tight text-foreground">
              주식회사 올댓스파인 스마트 업무관리 시스템
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary">
              WMS
            </span>
            <span className="text-xs font-medium text-muted-foreground">v1.0</span>
          </div>
          <div className="flex-1" />
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
