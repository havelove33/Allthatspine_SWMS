import { requireRole } from "@/lib/auth"

/** 예산 영역 전체 접근 가드 — 회계담당·관리자만. 그 외는 대시보드로 리다이렉트. */
export default async function BudgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole(["accountant", "admin"])
  return <>{children}</>
}
