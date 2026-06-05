import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/dashboard/page-header"
import { PostForm } from "../post-form"

export default async function NewBoardPostPage() {
  const me = await getCurrentEmployee()
  return (
    <div>
      <PageHeader title="글쓰기" description="공지 · 자유 · 건의" />
      <PostForm isAdmin={isAdmin(me)} />
    </div>
  )
}
