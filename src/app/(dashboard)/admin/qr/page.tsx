import Link from "next/link"
import { Monitor, UserPlus, ExternalLink } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function QrSetupPage() {
  await requireRole(["admin"])

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="사무실 QR (회전)"
        description="사무실 화면에 띄울 회전 QR입니다. 1시간마다 코드가 자동으로 바뀝니다."
      />

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Monitor className="size-5 text-primary" />
            설정 방법
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <b className="text-foreground">키오스크 전용 계정 생성</b> — 직원 관리에서 역할을
              <b className="text-foreground"> “키오스크”</b>로 계정을 하나 만드세요. (관리자 계정을
              사무실에 띄우면 위험하므로 전용 계정을 씁니다.)
            </li>
            <li>사무실에 둘 기기(태블릿·모니터·남는 PC)에서 그 키오스크 계정으로 로그인합니다.</li>
            <li>자동으로 QR 화면이 뜹니다. <b className="text-foreground">“전체화면”</b> 버튼을 누르세요.</li>
            <li>직원은 출근 시 휴대폰으로 이 QR을 스캔합니다.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/employees" className={cn(buttonVariants())}>
              <UserPlus className="size-4" />
              키오스크 계정 만들기
            </Link>
            <Link
              href="/kiosk"
              target="_blank"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ExternalLink className="size-4" />
              QR 화면 미리보기
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 text-sm">
          <p className="font-semibold">보안</p>
          <p className="mt-1 text-muted-foreground">
            코드가 1시간마다 바뀌므로, QR을 사진 찍어 공유하거나 원격으로 빼돌려도 곧 만료되어
            무효가 됩니다. 회사 IP 제한과 함께 쓰면 원격 우회를 강력하게 차단합니다. 키오스크
            계정은 이 QR 화면 외에는 아무 데도 접근할 수 없습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
