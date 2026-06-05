"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  approveMission,
  completeMission,
  updateMissionProgress,
  saveManagerReview,
} from "../actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export interface MissionForControls {
  id: string
  status: string
  progress: number
  self_evaluation: string | null
  manager_evaluation: string | null
  result: string | null
}

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

export function MissionControls({
  mission,
  isOwner,
  isAdmin,
}: {
  mission: MissionForControls
  isOwner: boolean
  isAdmin: boolean
}) {
  const [progress, setProgress] = useState(mission.progress)
  const [selfEval, setSelfEval] = useState(mission.self_evaluation ?? "")
  const [managerEval, setManagerEval] = useState(mission.manager_evaluation ?? "")
  const [result, setResult] = useState(mission.result ?? "")
  const [busy, setBusy] = useState<string | null>(null)

  const isDone = mission.status === "완료"
  const inProgress = mission.status === "진행"
  const canEditProgress = (isOwner || isAdmin) && !isDone

  async function run(
    key: string,
    fn: () => Promise<{ ok: true } | { ok: false; error: string } | undefined>
  ) {
    setBusy(key)
    const res = await fn()
    setBusy(null)
    if (res?.ok) toast.success("저장되었습니다.")
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="space-y-5">
      {/* 상태 액션 */}
      <div className="flex flex-wrap gap-2">
        {mission.status === "작성" && isAdmin && (
          <Button
            disabled={busy !== null}
            onClick={() => run("approve", () => approveMission(mission.id))}
          >
            승인
          </Button>
        )}
        {inProgress && (isOwner || isAdmin) && (
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("complete", () => completeMission(mission.id))}
          >
            완료 처리
          </Button>
        )}
      </div>

      {/* 진행률 */}
      {canEditProgress && (
        <div className="rounded-lg border bg-card p-4">
          <Label className="mb-2 block">진행률</Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1 accent-[var(--primary)]"
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-20"
            />
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => run("progress", () => updateMissionProgress(mission.id, progress))}
            >
              저장
            </Button>
          </div>
        </div>
      )}

      {/* 자기 평가 (담당자) */}
      {isOwner && (inProgress || isDone) && (
        <div className="rounded-lg border bg-card p-4">
          <Label className="mb-2 block">자기 평가</Label>
          <Textarea
            rows={3}
            value={selfEval}
            onChange={(e) => setSelfEval(e.target.value)}
            placeholder="달성 정도·소감을 적어주세요"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                run("self", () => updateMissionProgress(mission.id, progress, selfEval))
              }
            >
              저장
            </Button>
          </div>
        </div>
      )}

      {!isOwner && mission.self_evaluation && (
        <div className="rounded-lg border bg-card p-4">
          <Label className="mb-1 block">담당자 자기 평가</Label>
          <p className="mt-1 text-sm whitespace-pre-wrap">{mission.self_evaluation}</p>
        </div>
      )}

      {/* 관리자 평가 */}
      {isAdmin && (inProgress || isDone) && (
        <div className="rounded-lg border bg-card p-4">
          <Label className="mb-2 block">관리자 평가</Label>
          <Textarea
            rows={3}
            value={managerEval}
            onChange={(e) => setManagerEval(e.target.value)}
            placeholder="평가 내용"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <select className={`${SELECT_CLS} w-28`} value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">결과</option>
              {["달성", "미달", "초과"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => run("manager", () => saveManagerReview(mission.id, managerEval, result))}
            >
              저장
            </Button>
          </div>
        </div>
      )}

      {!isAdmin && (mission.manager_evaluation || mission.result) && (
        <div className="rounded-lg border bg-card p-4">
          <Label className="mb-1 block">관리자 평가</Label>
          {mission.result && (
            <Badge variant="secondary" className="mb-1">{mission.result}</Badge>
          )}
          <p className="mt-1 text-sm whitespace-pre-wrap">{mission.manager_evaluation}</p>
        </div>
      )}
    </div>
  )
}
