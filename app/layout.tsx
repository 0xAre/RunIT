import type { Metadata } from "next";
import { Manrope, Inter, Unbounded, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

// ── Font preloading via next/font (eliminates FOUT & blocking requests) ──
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display-next",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-next",
  display: "swap",
  preload: true,
});

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-heading-next",
  display: "swap",
  preload: false, // only needed in workspace
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-next",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://runit.web.app"
  ),
  title: "RunIT — AI Event Execution System",
  description:
    "AI-powered operational execution and simulation system that helps teams transform event chaos into coordinated real-world execution.",
  keywords: ["event management", "AI", "event planning", "operational intelligence", "simulation"],
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
  openGraph: {
    title: "RunIT — Simulate. Prepare. Execute.",
    description:
      "Turn event chaos into operational clarity with AI-powered simulation and execution intelligence.",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "RunIT" }],
  },
  twitter: {
    card: "summary",
    title: "RunIT — AI Event Execution System",
    description:
      "Turn event chaos into operational clarity with AI-powered simulation and execution intelligence.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${manrope.variable} ${inter.variable} ${unbounded.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
