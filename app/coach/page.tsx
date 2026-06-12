"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function CoachLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/coach/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/coach/dashboard");
    } else {
      setError("Wrong password. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-abyss flex flex-col items-center justify-center px-6">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 600px 300px at 50% 20%, rgba(224,182,79,0.06), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm z-10"
      >
        <p className="font-display text-gold text-[11px] tracking-[0.35em] mb-2 text-center">
          Ocean Athlete
        </p>
        <h1 className="font-display text-ink text-4xl text-center mb-8">
          Coach Access
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-2xl px-5 py-4 text-base text-ink placeholder:text-ink-faint outline-none"
            style={{
              background: "var(--glass)",
              border: `1px solid ${error ? "var(--coral)" : "var(--glass-edge)"}`,
            }}
          />

          {error && (
            <p className="text-coral text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-2xl py-4 font-display text-[15px] tracking-widest gold-sheen transition-opacity disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, var(--gold), #c79a35)",
              color: "#11202a",
            }}
          >
            {loading ? "Entering…" : "Enter Dashboard"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="font-display text-ink-faint text-[11px] tracking-widest hover:text-ink transition-colors"
          >
            ← Student Login
          </a>
        </div>
      </motion.div>
    </div>
  );
}
