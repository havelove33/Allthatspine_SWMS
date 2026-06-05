import Link from "next/link"
import { Users, Clock, Globe, FileText, QrCode, Tag, Database } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const SECTIONS = [
  {
    href: "/admin/employees",
    title: "직원 관리",
    desc: "직원 계정 생성·권한·연차·재직상태",
    icon: Users,
    ready: true,
  },
  {
    href: "/admin/settings",
    title: "근무 규칙",
    desc: "근무시간·지각 기준·보고 마감",
    icon: Clock,
    ready: true,
  },
  {
    href: "/admin/settings",
    title: "허용 IP 대역",
    desc: "출퇴근 가능한 회사 IP 범위",
    icon: Globe,
    ready: true,
  },
  {
    href: "/admin/templates",
    title: "보고 템플릿",
    desc: "일·주·월 보고 항목 편집",
    icon: FileText,
    ready: true,
  },
  {
    href: "/admin/projects",
    title: "프로젝트 태그",
    desc: "업무보고에 연결할 프로젝트",
    icon: Tag,
    ready: true,
  },
  {
    href: "/admin/qr",
    title: "사무실 QR",
    desc: "출퇴근 인증용 QR 발급",
    icon: QrCode,
    ready: true,
  },
  {
    href: "/admin/backup",
    title: "데이터 백업",
    desc: "전체 데이터 백업·복원 (이중화)",
    icon: Database,
    ready: true,
  },
]

export default async function AdminPage() {
  await requireRole(["admin"])

  return (
    <div>
      <PageHeader title="관리자 설정" description="시스템 운영 설정" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const card = (
            <Card
              className={
                s.ready
                  ? "h-full transition-colors hover:border-primary/50 hover:bg-accent/40"
                  : "h-full opacity-60"
              }
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {s.title}
                      {!s.ready && (
                        <Badge variant="secondary" className="text-[10px]">
                          준비중
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{s.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
          return s.ready ? (
            <Link key={s.title} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.title}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
