"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { saveTemplate } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { TemplateField, FieldType, ReportType } from "@/types"

const TYPE_LABEL: Record<ReportType, string> = {
  daily: "일일",
  weekly: "주간",
  monthly: "월간",
}
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "한 줄 텍스트" },
  { value: "textarea", label: "여러 줄 텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택(1개)" },
  { value: "multiselect", label: "다중 선택" },
]
const SELECT_CLS =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

function genKey() {
  return "f_" + Math.random().toString(36).slice(2, 8)
}

export function TemplatesEditor({
  initial,
}: {
  initial: Record<string, TemplateField[]>
}) {
  const [type, setType] = useState<ReportType>("daily")
  const [byType, setByType] = useState<Record<string, TemplateField[]>>(initial)
  const [pending, setPending] = useState(false)

  const fields = byType[type] ?? []

  function setFields(next: TemplateField[]) {
    setByType((prev) => ({ ...prev, [type]: next }))
  }
  function update(idx: number, patch: Partial<TemplateField>) {
    setFields(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }
  function addField() {
    setFields([
      ...fields,
      { key: genKey(), label: "", type: "text", required: false },
    ])
  }
  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx))
  }

  async function onSave() {
    setPending(true)
    const res = await saveTemplate(type, fields)
    setPending(false)
    if (res?.ok) toast.success(`${TYPE_LABEL[type]} 템플릿을 저장했습니다.`)
    else toast.error(res && !res.ok ? res.error : "오류가 발생했습니다.")
  }

  return (
    <div className="space-y-4">
      {/* 유형 탭 */}
      <div className="flex gap-1 rounded-md border p-1">
        {(["daily", "weekly", "monthly"] as ReportType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "rounded px-4 py-1.5 text-sm font-medium",
              type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {TYPE_LABEL[t]} 보고
          </button>
        ))}
      </div>

      {type === "daily" && (
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
          일일 보고는 <b className="text-foreground">업무 목록 형식</b>(업무 내용 · 프로젝트 · 시간 ·
          상태)으로 고정되어 있습니다. 항목 편집은 주간·월간 보고에만 적용됩니다.
        </div>
      )}
      {type !== "daily" && (
        <>
      <div className="space-y-2 rounded-lg border bg-card p-4">
        {fields.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            필드가 없습니다. “필드 추가”를 눌러 시작하세요.
          </p>
        )}
        {fields.map((f, idx) => {
          const needsOptions = f.type === "select" || f.type === "multiselect"
          return (
            <div
              key={f.key}
              className="flex flex-wrap items-center gap-2 rounded-md border p-2"
            >
              <Input
                value={f.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="항목 이름 (예: 오늘 한 일)"
                className="min-w-[160px] flex-1"
              />
              <select
                value={f.type}
                onChange={(e) => update(idx, { type: e.target.value as FieldType })}
                className={SELECT_CLS}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {needsOptions && (
                <Input
                  value={(f.options ?? []).join(", ")}
                  onChange={(e) =>
                    update(idx, { options: e.target.value.split(",").map((s) => s.trim()) })
                  }
                  placeholder="옵션: 예정, 진행중, 완료"
                  className="min-w-[180px] flex-1"
                />
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={f.required}
                  onCheckedChange={(v) => update(idx, { required: !!v })}
                />
                필수
              </label>
              <Button variant="ghost" size="icon-sm" onClick={() => removeField(idx)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          )
        })}

        <div className="flex justify-between pt-2">
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="size-4" />
            필드 추가
          </Button>
          <Button onClick={onSave} disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        프로젝트 태그와 소요시간은 모든 보고에 기본 포함됩니다. 여기서는 그 외 항목을 정의합니다.
      </p>
        </>
      )}
    </div>
  )
}
