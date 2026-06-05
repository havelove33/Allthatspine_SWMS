"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** 주기적으로 서버 데이터를 새로고침 (현황판 등 준실시간 갱신용). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
