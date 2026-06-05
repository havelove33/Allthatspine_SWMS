import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PostView } from "../post-client"

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>
}) {
  const me = await getCurrentEmployee()
  const { id, postId } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("project_posts")
    .select("*, author:employees!author_id(name)")
    .eq("id", postId)
    .single()
  if (!post) notFound()

  const canEdit = post.author_id === me.id || isAdmin(me)

  return (
    <div className="max-w-3xl">
      <Link
        href={`/projects/${id}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> 프로젝트로
      </Link>
      <PostView
        projectId={id}
        post={{
          id: post.id,
          title: post.title,
          body: post.body,
          authorName: post.author?.name ?? "?",
          created_at: post.created_at,
        }}
        canEdit={canEdit}
      />
    </div>
  )
}
