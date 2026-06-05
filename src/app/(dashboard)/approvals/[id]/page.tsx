import { notFound } from "next/navigation"
import { getCurrentEmployee, isAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { ApprovalDetail } from "./approval-detail"

export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await getCurrentEmployee()
  const admin = isAdmin(me)
  const supabase = await createClient()

  const [{ data: ap }, { data: cs }] = await Promise.all([
    supabase
      .from("approvals")
      .select(
        "*, applicant:employees!applicant_id(name), decider:employees!decided_by(name, signature_image_url)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("company_settings").select("seal_image_url").eq("id", 1).maybeSingle(),
  ])
  if (!ap) notFound()
  const sealUrl = (cs?.seal_image_url as string | null) ?? null
  const signatureUrl = (ap.decider?.signature_image_url as string | null) ?? null

  const { data: cData } = await supabase
    .from("approval_comments")
    .select("*, author:employees!author_id(name)")
    .eq("approval_id", id)
    .order("created_at", { ascending: true })

  const comments = (
    (cData ?? []) as unknown as {
      id: string
      content: string
      created_at: string
      author: { name: string } | null
    }[]
  ).map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    authorName: c.author?.name ?? "-",
  }))

  return (
    <ApprovalDetail
      isAdmin={admin}
      meId={me.id}
      sealUrl={sealUrl}
      signatureUrl={signatureUrl}
      approval={{
        id: ap.id,
        form_type: ap.form_type,
        title: ap.title,
        content: (ap.content ?? {}) as Record<string, unknown>,
        status: ap.status,
        reject_reason: ap.reject_reason,
        applicant_id: ap.applicant_id,
        applicantName: ap.applicant?.name ?? "-",
        deciderName: ap.decider?.name ?? null,
        decided_at: ap.decided_at,
        created_at: ap.created_at,
      }}
      comments={comments}
    />
  )
}
