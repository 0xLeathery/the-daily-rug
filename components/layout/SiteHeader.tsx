"use client";

import Link from "next/link";
import WalletArea from "@/components/layout/WalletArea";

export default function SiteHeader() {
  return (
    <header className="w-full flex justify-between items-center px-4 py-3 bg-brand-black border-b-[3px] border-brand-red">
      {/* Site name -- left side */}
      <div className="flex flex-col">
        <Link
          href="/"
          className="font-display font-bold text-brand-yellow uppercase tracking-tight leading-none text-[clamp(1.25rem,3vw,1.75rem)] no-underline"
        >
          THE DAILY RUG
        </Link>
        <span className="mt-0.5 font-display font-semibold text-[0.65rem] text-brand-red uppercase tracking-widest">
          WHERE WHALES SILENCE THE ALPHA
        </span>
      </div>

      {/* Wallet area -- right side */}
      <WalletArea />
    </header>
  );
}
