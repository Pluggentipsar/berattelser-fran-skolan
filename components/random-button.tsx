"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RandomButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/random");
      if (!res.ok) return;
      const { id } = (await res.json()) as { id: string | null };
      if (id) router.push(`/berattelser/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      title="Slumpa en berättelse"
      aria-label="Slumpa en berättelse"
      disabled={busy}
      className="fixed bottom-6 right-6 z-30 group flex items-center gap-2 px-4 py-3 bg-ink text-paper rounded-full shadow-lg hover:bg-ember disabled:opacity-50 transition-colors print:hidden"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="3" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        <circle cx="16" cy="8" r="1.2" fill="currentColor" />
        <circle cx="16" cy="16" r="1.2" fill="currentColor" />
        <circle cx="8" cy="16" r="1.2" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      </svg>
      <span className="font-sans text-sm font-medium">Slumpa</span>
    </button>
  );
}
