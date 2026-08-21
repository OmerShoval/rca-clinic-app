import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, Heebo, Literata, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./v2-tokens.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const heebo = Heebo({
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-hebrew",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

// ── Ocean Athlete v2 faces. Loaded alongside the v1 faces, never replacing
// them: only [data-v2] subtrees reference these variables.
const literata = Literata({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-read",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ocean Athlete",
  description: "Your personal coaching space.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ocean Athlete",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Keep maximumScale: 1 — on iOS Safari it is ignored for accessibility pinch-zoom
  // (since iOS 10) but still suppresses the jarring auto-zoom when focusing sub-16px
  // inputs, of which the coach forms have many.
  maximumScale: 1,
  // Required so env(safe-area-inset-*) resolves to real values under the Dynamic
  // Island / home indicator instead of 0.
  viewportFit: "cover",
  themeColor: "#070f15",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${inter.variable} ${heebo.variable} ${literata.variable} ${plexMono.variable} h-full dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
