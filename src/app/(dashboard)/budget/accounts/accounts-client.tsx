"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { addAccount, updateAccount, deleteAccount } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { formatKRW, ACCOUNT_KIND_LABEL } from "@/lib/budget"
import type { BudgetAccount } from "@/types"

type AccountRow = BudgetAccount & { balance: number; txn_count: number }

const FIELD =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export function AccountsManager({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter()

  // 추가 폼
  const [name, setName] = useState("")
  const [kind, setKind] = useState("bank")
  const [opening, setOpening] = useState("")
  const [note, setNote] = useState("")
  const [adding, setAdding] = useState(false)

  // 수정 다이얼로그
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccountRow | null>(null)
  const [eName, setEName] = useState("")
  const [eKind, setEKind] = useState("bank")
  const [eOpening, setEOpening] = useState("")
  const [eActive, setEActive] = useState("active")
  const [eNote, setENote] = useState("")
  const [saving, setSaving] = useState(false)

  async function onAdd() {
    if (!name.trim()) {
      toast.error("계정명을 입력하세요.")
      return
    }
    setAdding(true)
    const res = await addAccount({
      name,
      kind,
      opening_balance: Number(opening) || 0,
      note,
    })
    setAdding(false)
    if (res?.ok) {
      toast.success("계정을 추가했습니다.")
      setName("")
      setKind("bank")
      setOpening("")
      setNote("")
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  function openEdit(a: AccountRow) {
    setEditing(a)
    setEName(a.name)
    setEKind(a.kind)
    setEOpening(String(a.opening_balance ?? ""))
    setEActive(a.is_active ? "active" : "inactive")
    setENote(a.note ?? "")
    setOpen(true)
  }

  async function onSaveEdit() {
    if (!editing) return
    setSaving(true)
    const res = await updateAccount(editing.id, {
      name: eName,
      kind: eKind,
      opening_balance: Number(eOpening) || 0,
      is_active: eActive === "active",
      note: eNote,
    })
    setSaving(false)
    if (res?.ok) {
      toast.success("저장되었습니다.")
      setOpen(false)
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  async function onDelete(a: AccountRow) {
    const msg =
      a.txn_count > 0
        ? `'${a.name}' 계정을 삭제할까요?\n연결된 거래 ${a.txn_count}건은 보존되며 계정 연결만 해제됩니다.`
        : `'${a.name}' 계정을 삭제할까요?`
    if (!confirm(msg)) return
    const res = await deleteAccount(a.id)
    if (res?.ok) {
      toast.success("삭제되었습니다.")
      router.refresh()
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <div className="space-y-6">
      {/* 추가 폼 */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">계정 추가</h2>
        <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="a-name">계정명</Label>
            <Input
              id="a-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 기업은행 운영통장"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-kind">종류</Label>
            <select id="a-kind" className={FIELD} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="bank">통장</option>
              <option value="card">법인카드</option>
              <option value="cash">현금</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-open">기초 잔액 (원)</Label>
            <MoneyInput
              id="a-open"
              value={opening}
              onValueChange={setOpening}
              placeholder="0"
            />
          </div>
          <Button onClick={onAdd} disabled={adding}>
            <Plus className="size-4" />
            {adding ? "추가 중…" : "추가"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ※ 카드는 기초 잔액 0으로 두고, 사용내역을 ‘출금’ 거래로 입력하면 월 사용액이 집계됩니다.
        </p>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>계정명</TableHead>
              <TableHead>종류</TableHead>
              <TableHead className="text-right">기초 잔액</TableHead>
              <TableHead className="text-right">현재 잔액</TableHead>
              <TableHead className="text-center">거래</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id} className={a.is_active ? "" : "opacity-55"}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ACCOUNT_KIND_LABEL[a.kind]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatKRW(a.opening_balance)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {a.kind === "card" ? (
                    <span className="text-amber-600">사용 {formatKRW(-a.balance)}</span>
                  ) : (
                    formatKRW(a.balance)
                  )}
                </TableCell>
                <TableCell className="text-center text-muted-foreground tabular-nums">
                  {a.txn_count}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={a.is_active ? "default" : "outline"}>
                    {a.is_active ? "활성" : "비활성"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)} title="수정">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDelete(a)} title="삭제">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  등록된 계정이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>계정 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="e-name">계정명</Label>
              <Input id="e-name" value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="e-kind">종류</Label>
                <select id="e-kind" className={FIELD} value={eKind} onChange={(e) => setEKind(e.target.value)}>
                  <option value="bank">통장</option>
                  <option value="card">법인카드</option>
                  <option value="cash">현금</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-status">상태</Label>
                <select id="e-status" className={FIELD} value={eActive} onChange={(e) => setEActive(e.target.value)}>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-open">기초 잔액 (원)</Label>
              <MoneyInput
                id="e-open"
                value={eOpening}
                onValueChange={setEOpening}
              />
              <p className="text-xs text-muted-foreground">
                기초 잔액을 바꾸면 현재 잔액도 함께 조정됩니다.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-note">비고 (선택)</Label>
              <Textarea id="e-note" rows={2} value={eNote} onChange={(e) => setENote(e.target.value)} />
            </div>
          </div>
          <div className="-mx-4 -mb-4 mt-1 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={onSaveEdit} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
