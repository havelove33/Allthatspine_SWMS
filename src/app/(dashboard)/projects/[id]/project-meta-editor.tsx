"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { updateProjectMeta } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export interface ProjectMeta {
  id: string
  overview: string | null
  status: string
  status_light: string
  progress: number
  start_date: string | null
  end_date: string | null
  parent_project_id: string | null
}

export function ProjectMetaEditor({
  project,
  parents,
}: {
  project: ProjectMeta
  parents: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [overview, setOverview] = useState(project.overview ?? "")
  const [status, setStatus] = useState(project.status)
  const [light, setLight] = useState(project.status_light)
  const [progress, setProgress] = useState(project.progress)
  const [start, setStart] = useState(project.start_date ?? "")
  const [end, setEnd] = useState(project.end_date ?? "")
  const [parent, setParent] = useState(project.parent_project_id ?? "")

  async function onSave() {
    setPending(true)
    const res = await updateProjectMeta(project.id, {
      overview,
      status,
      status_light: light,
      progress,
      start_date: start,
      end_date: end,
      parent_project_id: parent,
    })
    setPending(false)
    if (res?.ok) {
      toast.success("저장되었습니다.")
      setOpen(false)
    } else {
      toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        프로젝트 수정
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>프로젝트 수정</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto">
            <div className="grid gap-2">
              <Label>개요</Label>
              <Textarea
                rows={6}
                value={overview}
                onChange={(e) => setOverview(e.target.value)}
                placeholder="추진 목표·배경·범위·전략 등을 작성하세요."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>상태</Label>
                <select className={SELECT_CLS} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {["진행중", "완료", "보류", "중단"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>신호등</Label>
                <select className={SELECT_CLS} value={light} onChange={(e) => setLight(e.target.value)}>
                  <option value="green">🟢 정상</option>
                  <option value="yellow">🟡 지연</option>
                  <option value="red">🔴 위험</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>진행률(%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label>상위 프로젝트</Label>
                <select className={SELECT_CLS} value={parent} onChange={(e) => setParent(e.target.value)}>
                  <option value="">없음</option>
                  {parents
                    .filter((p) => p.id !== project.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>시작일</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>종료일</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={onSave} disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
