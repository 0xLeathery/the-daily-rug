"use client";

import Link from "next/link";
import WalletArea from "@/components/layout/WalletArea";

export default function SiteHeader() {
  const mint = process.env.NEXT_PUBLIC_TOKEN_MINT;
  const ticker = process.env.NEXT_PUBLIC_TOKEN_TICKER;

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

      {/* Right side: Buy CTA + Wallet area */}
      <div className="flex items-center gap-3">
        {mint && ticker && (
          <a
            href={`https://pump.fun/coin/${mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display uppercase tracking-widest text-xs bg-brand-yellow text-brand-black px-3 py-1 hover:bg-yellow-300 transition-colors font-bold"
          >
            BUY ${ticker}
          </a>
        )}
        <WalletArea />
      </div>
    </header>
  );
}
