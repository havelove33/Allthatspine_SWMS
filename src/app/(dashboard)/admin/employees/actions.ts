"use server"

import { z } from "zod"
import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getCurrentEmployee } from "@/lib/auth"

// ── 공통 ─────────────────────────────────────────────
async function assertAdmin() {
  const me = await getCurrentEmployee() // 미인증이면 /login 으로 리다이렉트
  if (me.role !== "admin") throw new Error("권한이 없습니다.")
  return me
}

function field(fd: FormData, key: string): string | undefined {
  const v = fd.get(key)
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined
}

function genPassword(): string {
  // 영문 대소문자/숫자 + 고정 특수 = 정책 충족하는 임시 비번
  const base = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "")
  return base.slice(0, 10) + "A1!"
}

const ROLES = ["employee", "accountant", "manager", "admin", "kiosk"] as const
const STATUSES = ["재직", "휴직", "퇴사"] as const

// ── 직원 생성 ────────────────────────────────────────
export type CreateState =
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string }
  | undefined

const CreateSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요."),
  email: z.email("올바른 이메일을 입력하세요."),
  role: z.enum(ROLES),
  employee_no: z.string().optional(),
  phone: z.string().optional(),
  hire_date: z.string().optional(),
  position: z.string().optional(),
  employment_type: z.string().optional(),
  flexible_work: z.boolean().optional(),
  annual_leave_total: z.coerce.number().min(0).optional(),
  annual_leave_used: z.coerce.number().min(0).optional(),
})

export async function createEmployee(
  _prev: CreateState,
  formData: FormData
): Promise<CreateState> {
  await assertAdmin()

  const parsed = CreateSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    role: field(formData, "role") ?? "employee",
    employee_no: field(formData, "employee_no"),
    phone: field(formData, "phone"),
    hire_date: field(formData, "hire_date"),
    position: field(formData, "position"),
    employment_type: field(formData, "employment_type"),
    flexible_work: formData.get("flexible_work") === "on",
    annual_leave_total: field(formData, "annual_leave_total"),
    annual_leave_used: field(formData, "annual_leave_used"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." }
  }
  const d = parsed.data
  const admin = createAdminClient()
  const password = genPassword()

  // 1) Auth 계정 생성
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: d.email,
    password,
    email_confirm: true,
  })
  if (authErr || !created?.user) {
    const dup = authErr?.message?.toLowerCase().includes("already")
    return { ok: false, error: dup ? "이미 등록된 이메일입니다." : `계정 생성 실패: ${authErr?.message}` }
  }

  // 2) employees 프로필 생성
  const { error: dbErr } = await admin.from("employees").insert({
    id: created.user.id,
    name: d.name,
    email: d.email,
    role: d.role,
    employee_no: d.employee_no ?? null,
    phone: d.phone ?? null,
    hire_date: d.hire_date ?? null,
    position: d.position ?? null,
    employment_type: d.employment_type ?? null,
    flexible_work: d.flexible_work ?? false,
    annual_leave_total: d.annual_leave_total ?? 0,
    annual_leave_used: d.annual_leave_used ?? 0,
    must_change_password: true,
  })
  if (dbErr) {
    // 롤백: 방금 만든 auth 계정 삭제
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, error: `직원 정보 저장 실패: ${dbErr.message}` }
  }

  revalidatePath("/admin/employees")
  return { ok: true, email: d.email, tempPassword: password }
}

// ── 직원 수정 ────────────────────────────────────────
export type UpdateState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "이름을 입력하세요."),
  role: z.enum(ROLES),
  status: z.enum(STATUSES),
  employee_no: z.string().optional(),
  phone: z.string().optional(),
  hire_date: z.string().optional(),
  position: z.string().optional(),
  employment_type: z.string().optional(),
  flexible_work: z.boolean().optional(),
  annual_leave_total: z.coerce.number().min(0).optional(),
  annual_leave_used: z.coerce.number().min(0).optional(),
})

export async function updateEmployee(
  _prev: UpdateState,
  formData: FormData
): Promise<UpdateState> {
  const me = await assertAdmin()

  const parsed = UpdateSchema.safeParse({
    id: field(formData, "id"),
    name: field(formData, "name"),
    role: field(formData, "role") ?? "employee",
    status: field(formData, "status") ?? "재직",
    employee_no: field(formData, "employee_no"),
    phone: field(formData, "phone"),
    hire_date: field(formData, "hire_date"),
    position: field(formData, "position"),
    employment_type: field(formData, "employment_type"),
    flexible_work: formData.get("flexible_work") === "on",
    annual_leave_total: field(formData, "annual_leave_total"),
    annual_leave_used: field(formData, "annual_leave_used"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." }
  }
  const d = parsed.data

  // 본인 역할을 스스로 admin 아닌 것으로 강등하는 실수 방지
  if (d.id === me.id && d.role !== "admin") {
    return { ok: false, error: "본인의 관리자 권한은 해제할 수 없습니다." }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("employees")
    .update({
      name: d.name,
      role: d.role,
      status: d.status,
      employee_no: d.employee_no ?? null,
      phone: d.phone ?? null,
      hire_date: d.hire_date ?? null,
      position: d.position ?? null,
      employment_type: d.employment_type ?? null,
      flexible_work: d.flexible_work ?? false,
      annual_leave_total: d.annual_leave_total ?? 0,
      annual_leave_used: d.annual_leave_used ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id)
  if (error) return { ok: false, error: `저장 실패: ${error.message}` }

  // 퇴사 시 로그인 차단(ban), 그 외 해제
  await admin.auth.admin.updateUserById(d.id, {
    ban_duration: d.status === "퇴사" ? "876000h" : "none",
  })

  revalidatePath("/admin/employees")
  return { ok: true }
}

// ── 비밀번호 초기화 ──────────────────────────────────
export type ResetState =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string }
  | undefined

export async function resetPassword(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  await assertAdmin()
  const id = field(formData, "id")
  if (!id) return { ok: false, error: "대상이 없습니다." }

  const admin = createAdminClient()
  const password = genPassword()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) return { ok: false, error: `초기화 실패: ${error.message}` }

  await admin
    .from("employees")
    .update({ must_change_password: true })
    .eq("id", id)

  return { ok: true, tempPassword: password }
}
