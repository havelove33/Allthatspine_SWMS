import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCurrentEmployee } from "@/lib/auth"
import { PageHeader } from "@/components/dashboard/page-header"
import { PostEditor } from "../post-client"

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getCurrentEmployee()
  const { id } = await params
  return (
    <div className="max-w-3xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> 프로젝트로
      </Link>
      <PageHeader title="새 게시글" description="프로젝트 이해를 돕는 글을 작성하세요." />
      <PostEditor projectId={id} />
    </div>
  )
}
