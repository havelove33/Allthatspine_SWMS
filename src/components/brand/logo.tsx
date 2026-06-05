import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * 올댓스파인 공식 로고 (public/logo.png · 512×179).
 * 크기는 className의 높이 클래스(h-8, h-12 등)로 조절. 기본 h-10.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="올댓스파인"
      width={512}
      height={179}
      priority
      className={cn("h-10 w-auto", className)}
    />
  )
}
