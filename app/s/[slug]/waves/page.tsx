import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WavesPage({ params }: Props) {
  const { slug } = await params;
  return (
    <main className="flex flex-col items-center justify-center flex-1 px-6 py-20 gap-6 text-center">
      <p className="text-5xl">🌊</p>
      <h2 className="font-display text-ink text-3xl">My Waves</h2>
      <p className="text-ink-dim text-sm max-w-xs">
        Your debrief sessions will appear here once Omer publishes them.
      </p>
      <Link
        href={`/s/${slug}`}
        className="font-display text-teal text-sm tracking-widest mt-4"
      >
        ← Back Home
      </Link>
    </main>
  );
}
