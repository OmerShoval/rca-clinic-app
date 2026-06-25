import { NextResponse } from "next/server";
import { requireCoachAuth } from "@/lib/coach-auth";

/**
 * POST /api/coach/cf-upload-url
 *
 * Returns a Cloudflare Stream one-time TUS upload URL.
 * The client TUS-uploads the video file directly to Cloudflare — Vercel
 * and Supabase never touch the video bytes.
 *
 * CF Stream then transcodes to HLS, generates I-frame playlists,
 * creates thumbnails, and serves from its global edge network.
 */
export async function POST() {
  const deny = await requireCoachAuth();
  if (deny) return deny;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json(
      { error: "Cloudflare Stream is not configured (missing env vars)" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 600,   // 10 min ceiling — generous for wave clips
        requireSignedURLs: false,  // public playback (students don't need auth)
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("CF Stream API error:", res.status, body);
    return NextResponse.json(
      { error: "Cloudflare Stream API returned an error" },
      { status: 502 }
    );
  }

  const data = (await res.json()) as {
    result: { uid: string; uploadURL: string };
  };

  return NextResponse.json({
    uid: data.result.uid,
    uploadUrl: data.result.uploadURL,
  });
}
