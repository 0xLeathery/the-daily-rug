"use client";

import Link from "next/link";
import WalletArea from "@/components/layout/WalletArea";

export default function SiteHeader() {
  return (
    <header
      className="w-full flex justify-between items-center px-4 py-3"
      style={{
        backgroundColor: "#0a0a0a",
        borderBottom: "3px solid #cc0000",
      }}
    >
      {/* Site name -- left side */}
      <div className="flex flex-col">
        <Link
          href="/"
          className="no-underline"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            color: "#ffd700",
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textDecoration: "none",
          }}
        >
          THE DAILY RUG
        </Link>
        <span
          className="mt-0.5"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "0.65rem",
            color: "#cc0000",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          WHERE WHALES SILENCE THE ALPHA
        </span>
      </div>

      {/* Wallet area -- right side */}
      <WalletArea />
    </header>
  );
}
