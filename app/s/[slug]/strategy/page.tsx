import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StrategyPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/s/${slug}/patterns`);
}
