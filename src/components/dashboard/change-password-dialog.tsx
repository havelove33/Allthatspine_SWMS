"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { KeyRound } from "lucide-react"
import { changeMyPassword } from "./account-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

/** 좌측 하단 사용자 영역에 들어가는 '비밀번호 변경' 버튼 + 다이얼로그. */
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) setError(null)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await changeMyPassword(undefined, new FormData(e.currentTarget))
    setPending(false)
    if (res?.ok) {
      toast.success("비밀번호가 변경되었습니다.")
      setOpen(false)
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="비밀번호 변경"
        aria-label="비밀번호 변경"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>새 비밀번호를 입력하세요. (8자 이상)</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="np">새 비밀번호</Label>
              <Input
                id="np"
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cp">새 비밀번호 확인</Label>
              <Input
                id="cp"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "변경 중…" : "변경"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
