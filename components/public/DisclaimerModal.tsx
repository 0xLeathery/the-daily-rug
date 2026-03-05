"use client";

import { useEffect, useState } from "react";

export const STORAGE_KEY = "tdr_disclaimer_accepted";

export const DISCLAIMER_TEXT =
  "The Daily Rug is a satirical Web3 parody project. All content is fictitious, AI-generated gossip, and does not constitute financial advice or factual reporting.";

export default function DisclaimerModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/95 backdrop-blur-sm">
      <div className="max-w-lg mx-4 bg-brand-black border-2 border-brand-red p-8 text-center">
        <h2 className="font-display font-bold text-brand-red uppercase tracking-widest text-2xl mb-4">
          DISCLAIMER
        </h2>
        <p className="font-mono text-brand-white text-sm mb-8 leading-relaxed">
          {DISCLAIMER_TEXT}
        </p>
        <button
          onClick={dismiss}
          className="bg-brand-yellow text-brand-black font-display font-bold uppercase tracking-widest text-sm px-8 py-3 hover:bg-yellow-300 transition-colors cursor-pointer"
        >
          I UNDERSTAND
        </button>
      </div>
    </div>
  );
}
