import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Review Dash",
  description: "Latest KardiaMobile customer reviews in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
