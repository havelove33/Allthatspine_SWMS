import { redirect } from "next/navigation"
import { getCurrentEmployee } from "@/lib/auth"
import { AppShell } from "@/components/dashboard/app-shell"
import { LoginAutoBackup } from "@/components/dashboard/login-auto-backup"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await getCurrentEmployee()
  // 키오스크 계정은 QR 화면만 접근 가능
  if (employee.role === "kiosk") redirect("/kiosk")
  return (
    <>
      <AppShell employee={employee}>{children}</AppShell>
      {employee.role === "admin" && <LoginAutoBackup />}
    </>
  )
}
