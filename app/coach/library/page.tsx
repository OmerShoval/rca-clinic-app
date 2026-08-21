import { redirect } from "next/navigation";
import { CoachLibraryClient } from "@/components/coach/library-client";
import { hasCoachSession } from "@/lib/coach-auth";

export default async function CoachLibraryPage() {
  if (!(await hasCoachSession())) redirect("/coach");

  return <CoachLibraryClient />;
}
