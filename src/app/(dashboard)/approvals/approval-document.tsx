/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react"
import { FORM_LABEL } from "./labels"

const COMPANY = "주식회사 올댓스파인"

export type ApprovalDoc = {
  id: string
  form_type: string
  title: string
  content: Record<string, unknown>
  status: string
  reject_reason: string | null
  applicantName: string
  deciderName: string | null
  decided_at: string | null
  created_at: string
}

function won(v: unknown): string {
  const n = Number(v)
  return n ? `${n.toLocaleString("ko-KR")}원` : "-"
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="w-28 border border-gray-400 bg-gray-100 px-3 py-1.5 text-left align-top text-sm font-medium text-gray-700">
      {children}
    </th>
  )
}
function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className="border border-gray-400 px-3 py-1.5 align-top text-sm">
      {children || "-"}
    </td>
  )
}

export function ApprovalDocument({
  approval,
  sealUrl,
  signatureUrl,
}: {
  approval: ApprovalDoc
  sealUrl?: string | null
  signatureUrl?: string | null
}) {
  const a = approval
  const c = a.content
  const docNo = `ATS-${a.created_at.slice(0, 10).replace(/-/g, "")}-${a.id.slice(0, 4).toUpperCase()}`

  const rows: [string, ReactNode][] = []
  if (a.form_type === "leave") {
    rows.push(["휴가 종류", String(c.leave_type ?? "")])
    rows.push([
      "기간",
      `${String(c.start_date ?? "")}${c.end_date && c.end_date !== c.start_date ? ` ~ ${String(c.end_date)}` : ""}`,
    ])
    rows.push(["일수", `${Number(c.days ?? 0) || 0}일`])
    rows.push(["사유", String(c.reason ?? "")])
  } else if (a.form_type === "expense") {
    rows.push(["금액", won(c.amount)])
    rows.push(["거래처", String(c.vendor ?? "")])
    rows.push(["용도", String(c.purpose ?? "")])
  } else if (a.form_type === "purchase") {
    rows.push(["품목", String(c.item ?? "")])
    rows.push(["금액", won(c.amount)])
    rows.push(["사유", String(c.reason ?? "")])
  } else {
    rows.push(["내용", <span key="body" className="whitespace-pre-wrap">{String(c.body ?? "")}</span>])
  }

  const approved = a.status === "승인"
  const stampName = approved ? a.deciderName ?? "" : a.status === "반려" ? "반려" : ""
  const stampDate = a.decided_at?.slice(0, 10) ?? ""

  return (
    <div className="print-document mx-auto w-[210mm] min-h-[297mm] bg-white p-[18mm] text-black shadow-sm">
      {/* 제목 + 결재란 */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">{FORM_LABEL[a.form_type] ?? a.form_type}</h1>
          <p className="mt-1 text-xs text-gray-500">{COMPANY}</p>
        </div>
        <table className="border-collapse text-center text-[11px] text-gray-700">
          <tbody>
            <tr>
              <td
                rowSpan={2}
                className="w-6 border border-gray-400 bg-gray-100 px-1 align-middle font-medium [writing-mode:vertical-rl]"
              >
                결재
              </td>
              <td className="h-5 w-24 border border-gray-400 bg-gray-100">신청</td>
              <td className="h-5 w-24 border border-gray-400 bg-gray-100">승인</td>
            </tr>
            <tr>
              <td className="h-16 border border-gray-400 align-top">
                <div className="pt-1">{a.applicantName}</div>
                <div className="mt-3 text-[10px] text-gray-500">{a.created_at.slice(0, 10)}</div>
              </td>
              <td className="h-16 border border-gray-400 align-top">
                {approved && signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="서명"
                    className="mx-auto mt-0.5 max-h-9 object-contain mix-blend-multiply"
                  />
                ) : (
                  <div className="pt-1 font-medium">{stampName}</div>
                )}
                {stampDate && <div className="mt-1 text-[10px] text-gray-500">{stampDate}</div>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 문서 메타 */}
      <table className="mb-5 w-full border-collapse">
        <tbody>
          <tr>
            <Th>문서번호</Th>
            <Td>{docNo}</Td>
            <Th>상태</Th>
            <Td>{a.status}</Td>
          </tr>
          <tr>
            <Th>신청자</Th>
            <Td>{a.applicantName}</Td>
            <Th>신청일</Th>
            <Td>{a.created_at.slice(0, 10)}</Td>
          </tr>
        </tbody>
      </table>

      {/* 제목줄 */}
      <div className="mb-4 border-y-2 border-gray-700 py-2 text-center text-lg font-semibold">
        {a.title}
      </div>

      {/* 내용 */}
      <table className="w-full border-collapse">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i}>
              <Th>{k}</Th>
              <Td colSpan={3}>{v}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {a.status === "반려" && a.reject_reason && (
        <table className="mt-3 w-full border-collapse">
          <tbody>
            <tr>
              <Th>반려 사유</Th>
              <Td colSpan={3}>
                <span className="text-red-700">{a.reject_reason}</span>
              </Td>
            </tr>
          </tbody>
        </table>
      )}

      {/* 푸터: 회사명 + 직인 */}
      <p className="mt-12 text-center text-sm">
        위와 같이 {FORM_LABEL[a.form_type] ?? "결재를"} 요청합니다.
      </p>
      <p className="mt-5 text-center text-sm">{a.created_at.slice(0, 10)}</p>
      <div className="mt-1 flex items-center justify-center">
        <span className="text-base font-semibold tracking-wide">{COMPANY}</span>
        {sealUrl && (
          <img
            src={sealUrl}
            alt="직인"
            className="-ml-2 h-16 w-16 object-contain mix-blend-multiply"
          />
        )}
      </div>
    </div>
  )
}
