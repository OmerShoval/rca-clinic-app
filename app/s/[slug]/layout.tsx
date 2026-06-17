import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import { LogoutButton } from "@/components/student/logout-button";
import { LanguageProvider } from "@/lib/language-context";
import { LanguageToggle } from "@/components/ui/language-toggle";
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
    <LanguageProvider>
      <div className="min-h-screen bg-abyss flex flex-col">
        {/* Language toggle — top-LEFT, own corner, always visible */}
        <div className="fixed top-4 left-4 z-50" dir="ltr">
          <LanguageToggle />
        </div>

        {/* Logout — top-RIGHT, own corner */}
        <div className="fixed top-4 right-4 z-50">
          <LogoutButton />
        </div>

        {children}

        <BottomNav slug={slug} />
      </div>
    </LanguageProvider>
  );
}
