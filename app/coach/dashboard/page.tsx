import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { CoachDashboardClient } from "@/components/coach-dashboard-client";

export default async function CoachDashboard() {
  const cookieStore = await cookies();
  const coachCookie = cookieStore.get("oa_coach")?.value;
  if (coachCookie !== "authenticated") redirect("/coach");

  const db = createServerClient();
  const { data: students } = await db
    .from("students")
    .select("id, full_name, slug, stage, focus_skill, status, clinic_id")
    .order("full_name");

  const { data: clinics } = await db
    .from("clinics")
    .select("id, number, name")
    .order("number");

  return (
    <CoachDashboardClient
      students={students ?? []}
      clinics={clinics ?? []}
    />
  );
}
