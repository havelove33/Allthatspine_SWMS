import Link from "next/link"
import Image from "next/image"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** 큰 숫자 KPI 카드. href 있으면 클릭 시 이동. */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: string
  href?: string
}) {
  const inner = (
    <div
      className={cn(
        "h-full rounded-xl border bg-card p-4",
        href && "transition-colors hover:border-primary/50 hover:bg-accent/30"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", tone)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

/** 제목 + (선택)더보기 링크가 있는 위젯 컨테이너. */
export function WidgetCard({
  title,
  icon: Icon,
  href,
  linkLabel = "더보기",
  className,
  children,
}: {
  title: string
  icon?: LucideIcon
  href?: string
  linkLabel?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="flex shrink-0 items-center text-xs text-muted-foreground hover:text-foreground"
          >
            {linkLabel}
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

/** 비어있을 때 안내문. */
export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>
}

/** 큰 빈 상태 — 척추·AI 일러스트 + 메시지 (+선택 액션). */
export function EmptyState({
  message,
  sub,
  action,
}: {
  message: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <Image src="/empty-spine.png" alt="" width={120} height={120} className="mb-3 opacity-70" />
      <p className="font-medium">{message}</p>
      {sub && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** 처리 대기 건수 칩 (대표 처리대기함용). */
export function PendingChip({
  label,
  count,
  href,
}: {
  label: string
  count: number
  href: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 transition-colors",
        count > 0
          ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
          : "bg-card hover:bg-accent/30"
      )}
    >
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "tabular-nums text-lg font-bold",
          count > 0 ? "text-amber-600" : "text-muted-foreground"
        )}
      >
        {count}
      </span>
    </Link>
  )
}
