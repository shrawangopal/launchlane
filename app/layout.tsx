import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launchlane — Client Launch Agent",
  description: "Evidence-backed client onboarding and verified workspace provisioning.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

