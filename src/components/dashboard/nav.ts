import {
  LayoutDashboard,
  CalendarClock,
  FileText,
  Target,
  FolderKanban,
  Wallet,
  MessageSquare,
  FolderOpen,
  CalendarDays,
  CheckSquare,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/types"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles?: Role[] // 지정 시 해당 역할만 노출 (미지정 = 전원)
  phase: 1 | 2 | 3 // 1 = MVP 구현, 2/3 = 준비중
}

export const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "/", icon: LayoutDashboard, phase: 1 },
  { label: "근태관리", href: "/attendance", icon: CalendarClock, phase: 1 },
  { label: "업무보고", href: "/reports", icon: FileText, phase: 1 },
  { label: "나의 업무", href: "/missions", icon: Target, phase: 1 },
  { label: "프로젝트", href: "/projects", icon: FolderKanban, phase: 1 },
  {
    label: "예산",
    href: "/budget",
    icon: Wallet,
    roles: ["accountant", "admin"],
    phase: 1,
  },
  { label: "게시판", href: "/board", icon: MessageSquare, phase: 1 },
  { label: "자료공유", href: "/files", icon: FolderOpen, phase: 1 },
  { label: "캘린더", href: "/calendar", icon: CalendarDays, phase: 1 },
  { label: "전자결재", href: "/approvals", icon: CheckSquare, phase: 1 },
  {
    label: "관리자",
    href: "/admin",
    icon: Settings,
    roles: ["admin"],
    phase: 1,
  },
]

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
