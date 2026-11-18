import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuddyRPG — Tabuleiro Virtual de RPG",
  description:
    "Virtual Tabletop minimalista e em tempo real para suas mesas de RPG online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
