import Image from "next/image"
import { LoginForm } from "./login-form"
import { Logo } from "@/components/brand/logo"
import { ClearLoginBackupFlag } from "@/components/dashboard/login-auto-backup"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <ClearLoginBackupFlag />

      {/* 배경 이미지 (데스크톱 / 모바일) */}
      <Image
        src="/login-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="hidden object-cover md:block"
      />
      <Image
        src="/login-bg-mobile.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover md:hidden"
      />
      {/* 가독성 오버레이 */}
      <div className="absolute inset-0 bg-white/35" />

      {/* 로그인 카드 */}
      <Card className="relative z-10 w-full max-w-sm border-white/50 bg-card/90 shadow-xl backdrop-blur-md">
        <CardHeader className="items-center text-center">
          <Logo className="mb-2 h-10" />
          <CardTitle className="text-base font-bold leading-snug">
            주식회사 올댓스파인 스마트 업무관리 시스템
          </CardTitle>
          <CardDescription className="text-[11px] font-medium tracking-wide">
            AllThatSpine Smart Work Management System · WMS
          </CardDescription>
          <CardDescription className="pt-2">계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
