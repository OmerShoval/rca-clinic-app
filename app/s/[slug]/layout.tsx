import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function StudentLayout({ children, params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("oa_token")?.value;

  if (!token) redirect("/");

  const db = createServerClient();
  const { data: session } = await db
    .from("sessions")
    .select("student_id, students(slug)")
    .eq("device_token", token)
    .single();

  if (!session) redirect("/");

  const ownSlug = (session.students as unknown as { slug: string } | null)?.slug;
  if (ownSlug !== slug) redirect(`/s/${ownSlug}`);

  return (
    <div className="min-h-screen bg-abyss flex flex-col pb-20">
      {children}
      <BottomNav slug={slug} />
    </div>
  );
}
