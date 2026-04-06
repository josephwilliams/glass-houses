import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glass Houses",
  description: "What's the worst thing every country has ever done?",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
