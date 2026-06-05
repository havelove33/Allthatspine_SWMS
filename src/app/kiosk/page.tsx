import { requireRole } from "@/lib/auth"
import { KioskDisplay } from "./kiosk-display"

// 키오스크 화면 (전용 kiosk 계정 또는 관리자만). 사무실 기기에 전체화면으로 띄워둠.
export default async function KioskPage() {
  await requireRole(["kiosk", "admin"])
  return <KioskDisplay />
}
