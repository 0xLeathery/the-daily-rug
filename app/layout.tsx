import type { Metadata } from "next";
import { Oswald, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/components/providers/SolanaProvider";
import SiteHeader from "@/components/layout/SiteHeader";
import DisclaimerModal from "@/components/public/DisclaimerModal";
import SiteFooter from "@/components/public/SiteFooter";

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Daily Rug",
  description: "Where Whales Silence The Alpha",
  openGraph: {
    title: "The Daily Rug",
    description: "Where Whales Silence The Alpha",
    siteName: "The Daily Rug",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Daily Rug",
    description: "Where Whales Silence The Alpha",
  },
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${oswald.variable} ${geistMono.variable} antialiased bg-brand-black text-brand-white`}
      >
        <SolanaProvider>
          <SiteHeader />
          <DisclaimerModal />
          {children}
          <SiteFooter />
        </SolanaProvider>
      </body>
    </html>
  );
}
