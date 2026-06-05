import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Employee, Role } from "@/types"

/**
 * 현재 로그인한 직원의 프로필을 반환. 미인증이면 /login으로 리다이렉트.
 */
export async function getCurrentEmployee(): Promise<Employee> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!employee) redirect("/login")
  return employee as Employee
}

/**
 * 특정 역할 이상을 요구. 권한 없으면 대시보드로 리다이렉트.
 */
export async function requireRole(allowed: Role[]): Promise<Employee> {
  const employee = await getCurrentEmployee()
  if (!allowed.includes(employee.role)) redirect("/")
  return employee
}

/**
 * 서버 액션용: 현재 사용자가 관리자인지 확인하고 반환. 아니면 throw.
 */
export async function getAdminOrThrow(): Promise<Employee> {
  const me = await getCurrentEmployee()
  if (me.role !== "admin") throw new Error("권한이 없습니다.")
  return me
}

/** 서버 액션용: 키오스크 또는 관리자만 허용. */
export async function getKioskOrThrow(): Promise<Employee> {
  const me = await getCurrentEmployee()
  if (me.role !== "kiosk" && me.role !== "admin") {
    throw new Error("권한이 없습니다.")
  }
  return me
}

export const isAdmin = (e: Pick<Employee, "role">) => e.role === "admin"
export const canAccessBudget = (e: Pick<Employee, "role">) =>
  e.role === "accountant" || e.role === "admin"

/** 서버 액션용: 예산 접근(회계담당/관리자)만 허용. 아니면 throw. */
export async function getBudgetOrThrow(): Promise<Employee> {
  const me = await getCurrentEmployee()
  if (!canAccessBudget(me)) throw new Error("예산 접근 권한이 없습니다.")
  return me
}
