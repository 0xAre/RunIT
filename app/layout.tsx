import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunIT — AI Event Execution System",
  description: "AI-powered operational execution and simulation system that helps teams transform event chaos into coordinated real-world execution.",
  keywords: ["event management", "AI", "event planning", "operational intelligence", "simulation"],
  openGraph: {
    title: "RunIT — Simulate. Prepare. Execute.",
    description: "Turn event chaos into operational clarity with AI-powered simulation and execution intelligence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Manrope: landing display font (Aeonik Pro visual match) */}
        {/* Unbounded: inner app heading/panel labels (Colosseum architekt match) */}
        {/* Inter: inner app body */}
        {/* JetBrains Mono: data/code/dot-matrix alternative */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@400;500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
