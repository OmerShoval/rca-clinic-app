import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireCoachAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const auth = cookieStore.get("oa_coach")?.value;
  if (auth !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
