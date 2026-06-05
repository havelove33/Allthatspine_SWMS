export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ComingSoon({ step }: { step?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed bg-card text-center">
      <p className="text-lg font-medium">준비 중인 기능입니다</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {step ? `${step} 단계에서 구현 예정입니다.` : "곧 제공될 예정입니다."}
      </p>
    </div>
  )
}
