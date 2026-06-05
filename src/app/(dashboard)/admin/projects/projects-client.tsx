"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Plus, Archive, ArchiveRestore } from "lucide-react"
import { createProject, archiveProject } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

interface Project {
  id: string
  name: string
  tag: string | null
  status: string
}

export function ProjectsManager({ projects }: { projects: Project[] }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = e.currentTarget
    const res = await createProject(undefined, new FormData(form))
    setPending(false)
    if (res?.ok) {
      toast.success("프로젝트를 추가했습니다.")
      form.reset()
    } else {
      setError(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  async function onArchive(id: string, archived: boolean) {
    setBusyId(id)
    const res = await archiveProject(id, archived)
    setBusyId(null)
    if (res?.ok) toast.success(archived ? "보관했습니다." : "복원했습니다.")
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 font-semibold">프로젝트 추가</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="p-name">프로젝트명</Label>
            <Input id="p-name" name="name" placeholder="예: 홈페이지 리뉴얼" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-tag">태그</Label>
            <Input id="p-tag" name="tag" placeholder="예: 리뉴얼" required />
          </div>
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" />
            {pending ? "추가 중…" : "추가"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트명</TableHead>
              <TableHead>태그</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => {
              const archived = p.status === "보관"
              return (
                <TableRow key={p.id} className={archived ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">#{p.tag}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={archived ? "outline" : "default"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onArchive(p.id, !archived)}
                      disabled={busyId === p.id}
                    >
                      {archived ? (
                        <>
                          <ArchiveRestore className="size-4" />
                          복원
                        </>
                      ) : (
                        <>
                          <Archive className="size-4" />
                          보관
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  등록된 프로젝트가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
