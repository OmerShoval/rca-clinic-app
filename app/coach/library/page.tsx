import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CoachLibraryClient } from "@/components/coach/library-client";

export default async function CoachLibraryPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("oa_coach")?.value !== "authenticated") redirect("/coach");

  return <CoachLibraryClient />;
}
