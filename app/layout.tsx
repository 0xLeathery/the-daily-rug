import type { Metadata } from "next";
import { Oswald, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/components/providers/SolanaProvider";
import SiteHeader from "@/components/layout/SiteHeader";

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
  description: "Where whales silence the alpha",
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
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
