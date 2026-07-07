import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-abyss flex flex-col items-center justify-center px-6 text-center">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 600px 300px at 50% 20%, rgba(47,214,192,0.06), transparent 70%)" }}
      />
      <p className="font-display text-teal text-[11px] tracking-[0.35em] mb-4">Ocean Athlete</p>
      <h1 className="font-display text-ink text-[clamp(64px,16vw,96px)] leading-none mb-2">404</h1>
      <p className="text-ink-dim text-sm max-w-xs mb-8">
        This wave doesn&apos;t exist. Head back to the shore.
      </p>
      <Link
        href="/"
        className="font-display text-[13px] tracking-widest text-teal px-6 py-3 rounded-2xl transition-opacity hover:opacity-80"
        style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
      >
        ← Back Home
      </Link>
    </div>
  );
}
