"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

/** 숫자 문자열을 천 단위 콤마로 표시. (앞에 - 허용) */
function withCommas(raw: string): string {
  if (raw === "" || raw === "-") return raw
  const neg = raw.trim().startsWith("-")
  const digits = raw.replace(/[^\d]/g, "")
  if (!digits) return neg ? "-" : ""
  return (neg ? "-" : "") + Number(digits).toLocaleString("ko-KR")
}

/**
 * 금액 입력: 화면에는 1,000,000 처럼 콤마 표시, 값은 숫자 문자열(콤마 없음)로 저장.
 * type="number"는 콤마를 허용하지 않으므로 text + inputMode=numeric 사용.
 */
export function MoneyInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string
  onValueChange: (digits: string) => void
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={withCommas(value)}
      onChange={(e) => {
        const v = e.target.value
        const neg = v.trim().startsWith("-")
        const digits = v.replace(/[^\d]/g, "")
        onValueChange((neg ? "-" : "") + digits)
      }}
    />
  )
}
