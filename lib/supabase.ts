import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side: anon key — used only for public queries (e.g. login autocomplete)
export const supabase = createClient<Database, "rca">(url, anonKey, {
  db: { schema: "rca" },
});

// Server-side: service role key — use ONLY in API routes and Server Components.
// Never import this on the client — it bypasses RLS.
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database, "rca">(url, serviceKey, {
    db: { schema: "rca" },
    auth: { persistSession: false },
  });
}
