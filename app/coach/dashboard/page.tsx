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
    .select("*")
    .order("full_name");

  const { data: clinics } = await db
    .from("clinics")
    .select("*")
    .order("number");

  return (
    <CoachDashboardClient
      students={students ?? []}
      clinics={clinics ?? []}
    />
  );
}
