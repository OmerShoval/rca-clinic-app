import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { hasCoachSession } from "@/lib/coach-auth";
import { CoachDashboardClient } from "@/components/coach-dashboard-client";
import { UploadManagerProvider } from "@/lib/upload-manager";

export default async function CoachDashboard() {
  if (!(await hasCoachSession())) redirect("/coach");

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
    <UploadManagerProvider>
      <CoachDashboardClient
        students={students ?? []}
        clinics={clinics ?? []}
      />
    </UploadManagerProvider>
  );
}
