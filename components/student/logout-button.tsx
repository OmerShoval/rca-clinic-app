"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/coach");
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="font-display text-[13px] tracking-[0.2em] font-bold px-4 py-1.5 rounded-full border border-coral/50 text-coral hover:bg-coral/10 transition-colors disabled:opacity-40"
    >
      {loading ? "…" : t("logout")}
    </button>
  );
}
