import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glass Houses",
  description: "Click a country. Learn something uncomfortable. An interactive globe exploring historical atrocities worldwide.",
  metadataBase: new URL("https://glass-houses.vercel.app"),
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌍</text></svg>",
  },
  openGraph: {
    title: "Glass Houses",
    description: "Click a country. Learn something uncomfortable.",
    url: "https://glass-houses.vercel.app",
    siteName: "Glass Houses",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Glass Houses - an interactive globe of historical atrocities",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glass Houses",
    description: "Click a country. Learn something uncomfortable.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
