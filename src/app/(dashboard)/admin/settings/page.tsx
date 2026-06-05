import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/page-header"
import { SettingsForm } from "./settings-form"
import { SettingsStamps } from "./settings-stamps"
import type { CompanySettings } from "@/types"

export default async function SettingsPage() {
  const me = await requireRole(["admin"])

  const supabase = await createClient()
  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single()

  const settings = data as CompanySettings

  return (
    <div>
      <PageHeader
        title="근무 규칙 · IP"
        description="출퇴근 기준 시간과 허용 IP 대역을 설정합니다."
      />
      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <p className="text-sm text-destructive">
          설정 데이터를 불러오지 못했습니다. 스키마(0001_init.sql)가 적용되었는지 확인하세요.
        </p>
      )}
      <SettingsStamps seal={settings?.seal_image_url ?? null} signature={me.signature_image_url} />
    </div>
  )
}
