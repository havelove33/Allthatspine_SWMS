"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { UserPlus, KeyRound, Pencil, Copy, Check } from "lucide-react"
import { createEmployee, updateEmployee, resetPassword } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { computeAnnualEntitlement } from "@/lib/leave"
import { getKstDateString } from "@/lib/attendance"
import type { Employee, Role } from "@/types"

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "employee", label: "직원" },
  { value: "accountant", label: "회계담당" },
  { value: "manager", label: "부서장" },
  { value: "admin", label: "관리자" },
  { value: "kiosk", label: "키오스크(QR화면)" },
]
const STATUS_OPTIONS = ["재직", "휴직", "퇴사"]
const EMPLOYMENT_OPTIONS = ["정규", "계약", "인턴"]

const ROLE_LABEL: Record<Role, string> = {
  employee: "직원",
  accountant: "회계담당",
  manager: "부서장",
  admin: "관리자",
  kiosk: "키오스크",
}

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">{children}</div>
}

// ── 임시 비밀번호 안내 패널 ──────────────────────────
function TempPasswordPanel({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const [copied, setCopied] = useState(false)
  const text = `이메일: ${email}\n임시 비밀번호: ${password}`
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">이메일</span>
          <span className="font-medium">{email}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span className="text-muted-foreground">임시 비밀번호</span>
          <span className="font-mono font-medium">{password}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        이 정보를 직원에게 전달하세요. 임시 비밀번호는 첫 로그인 후 변경하도록 안내해주세요.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "복사됨" : "계정 정보 복사"}
      </Button>
    </div>
  )
}

// ── 직원 추가 ────────────────────────────────────────
export function CreateEmployeeButton() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setError(null)
      setCreated(null)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await createEmployee(undefined, new FormData(e.currentTarget))
    setPending(false)
    if (res?.ok) setCreated({ email: res.email, password: res.tempPassword })
    else setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        직원 추가
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>직원 추가</DialogTitle>
            <DialogDescription>
              계정을 생성하면 임시 비밀번호가 발급됩니다.
            </DialogDescription>
          </DialogHeader>

          {created ? (
            <>
              <TempPasswordPanel email={created.email} password={created.password} />
              <DialogFooter>
                <Button onClick={() => handleOpenChange(false)}>완료</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Row>
                  <Label htmlFor="c-name">이름 *</Label>
                  <Input id="c-name" name="name" required />
                </Row>
                <Row>
                  <Label htmlFor="c-email">이메일 *</Label>
                  <Input id="c-email" name="email" type="email" required />
                </Row>
                <Row>
                  <Label htmlFor="c-role">역할 *</Label>
                  <select id="c-role" name="role" className={SELECT_CLS} defaultValue="employee">
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </Row>
                <Row>
                  <Label htmlFor="c-empno">사번</Label>
                  <Input id="c-empno" name="employee_no" />
                </Row>
                <Row>
                  <Label htmlFor="c-phone">연락처</Label>
                  <Input id="c-phone" name="phone" />
                </Row>
                <Row>
                  <Label htmlFor="c-hire">입사일</Label>
                  <Input id="c-hire" name="hire_date" type="date" />
                </Row>
                <Row>
                  <Label htmlFor="c-position">직급</Label>
                  <Input id="c-position" name="position" />
                </Row>
                <Row>
                  <Label htmlFor="c-emp">고용형태</Label>
                  <select id="c-emp" name="employment_type" className={SELECT_CLS} defaultValue="정규">
                    {EMPLOYMENT_OPTIONS.map((emp) => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                </Row>
                <Row>
                  <Label htmlFor="c-used">올해 기사용 연차(일)</Label>
                  <Input id="c-used" name="used_so_far" type="number" min="0" step="0.25" defaultValue="0" />
                </Row>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="flexible_work" className="size-4 accent-primary" />
                    <span><span className="font-medium">탄력근무제</span> — 출퇴근은 기록하되 지각·조기퇴근 집계 제외</span>
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                발생 연차는 입사일 기준으로 자동 계산됩니다. 시스템 도입 전 올해 이미 사용한 연차가
                있으면 “올해 기사용 연차”에 입력하세요.
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "생성 중…" : "생성"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── 직원 수정 ────────────────────────────────────────
function EditEmployeeButton({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await updateEmployee(undefined, new FormData(e.currentTarget))
    setPending(false)
    if (res?.ok) {
      toast.success("저장되었습니다.")
      setOpen(false)
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        수정
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setError(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>직원 정보 수정</DialogTitle>
            <DialogDescription>{employee.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="id" value={employee.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Row>
                <Label htmlFor={`e-name-${employee.id}`}>이름 *</Label>
                <Input id={`e-name-${employee.id}`} name="name" defaultValue={employee.name} required />
              </Row>
              <Row>
                <Label htmlFor={`e-role-${employee.id}`}>역할 *</Label>
                <select id={`e-role-${employee.id}`} name="role" className={SELECT_CLS} defaultValue={employee.role}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Row>
              <Row>
                <Label htmlFor={`e-status-${employee.id}`}>재직 상태 *</Label>
                <select id={`e-status-${employee.id}`} name="status" className={SELECT_CLS} defaultValue={employee.status}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Row>
              <Row>
                <Label htmlFor={`e-empno-${employee.id}`}>사번</Label>
                <Input id={`e-empno-${employee.id}`} name="employee_no" defaultValue={employee.employee_no ?? ""} />
              </Row>
              <Row>
                <Label htmlFor={`e-phone-${employee.id}`}>연락처</Label>
                <Input id={`e-phone-${employee.id}`} name="phone" defaultValue={employee.phone ?? ""} />
              </Row>
              <Row>
                <Label htmlFor={`e-hire-${employee.id}`}>입사일</Label>
                <Input id={`e-hire-${employee.id}`} name="hire_date" type="date" defaultValue={employee.hire_date ?? ""} />
              </Row>
              <Row>
                <Label htmlFor={`e-position-${employee.id}`}>직급</Label>
                <Input id={`e-position-${employee.id}`} name="position" defaultValue={employee.position ?? ""} />
              </Row>
              <Row>
                <Label htmlFor={`e-emp-${employee.id}`}>고용형태</Label>
                <select id={`e-emp-${employee.id}`} name="employment_type" className={SELECT_CLS} defaultValue={employee.employment_type ?? "정규"}>
                  {EMPLOYMENT_OPTIONS.map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </Row>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="flexible_work" defaultChecked={employee.flexible_work} className="size-4 accent-primary" />
                  <span><span className="font-medium">탄력근무제</span> — 출퇴근은 기록하되 지각·조기퇴근 집계 제외</span>
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              연차는 입사일 기준으로 자동 계산됩니다.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중…" : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── 비밀번호 초기화 ──────────────────────────────────
function ResetPasswordButton({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setError(null)
      setNewPassword(null)
    }
  }

  async function onConfirm() {
    setPending(true)
    setError(null)
    const fd = new FormData()
    fd.set("id", employee.id)
    const res = await resetPassword(undefined, fd)
    setPending(false)
    if (res?.ok) setNewPassword(res.tempPassword)
    else setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" />
        비번 초기화
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
            <DialogDescription>
              {employee.name} ({employee.email})
            </DialogDescription>
          </DialogHeader>

          {newPassword ? (
            <>
              <TempPasswordPanel email={employee.email} password={newPassword} />
              <DialogFooter>
                <Button onClick={() => handleOpenChange(false)}>완료</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                새 임시 비밀번호를 발급합니다. 기존 비밀번호는 사용할 수 없게 됩니다.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  취소
                </Button>
                <Button onClick={onConfirm} disabled={pending}>
                  {pending ? "초기화 중…" : "초기화"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── 직원 목록 테이블 ─────────────────────────────────
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  재직: "default",
  휴직: "secondary",
  퇴사: "outline",
}

export function EmployeeTable({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        등록된 직원이 없습니다. “직원 추가”로 시작하세요.
      </div>
    )
  }
  const today = getKstDateString(new Date())
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>직급</TableHead>
            <TableHead>입사일</TableHead>
            <TableHead className="text-center">발생 연차</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead className="text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">
                {e.name}
                {e.flexible_work && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] font-normal">탄력</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{e.email}</TableCell>
              <TableCell>{ROLE_LABEL[e.role]}</TableCell>
              <TableCell>{e.position ?? "-"}</TableCell>
              <TableCell>{e.hire_date ?? "-"}</TableCell>
              <TableCell className="text-center">
                {e.hire_date ? `${computeAnnualEntitlement(e.hire_date, today)}일` : "-"}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={STATUS_VARIANT[e.status] ?? "secondary"}>
                  {e.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <EditEmployeeButton employee={e} />
                  <ResetPasswordButton employee={e} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
