"use client";
import { useEffect, useState } from "react";

const KEY = "bfs.bookmarks.v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
}

export function useBookmarks() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(read()), []);
  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setIds(next);
    write(next);
  };
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

export function BookmarkButton({ id }: { id: string }) {
  const { has, toggle } = useBookmarks();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  const on = has(id);
  return (
    <button
      onClick={() => toggle(id)}
      title={on ? "Ta bort bokmärke" : "Bokmärk"}
      aria-label={on ? "Ta bort bokmärke" : "Bokmärk"}
      className={
        "inline-flex items-center gap-1.5 font-sans text-xs px-2.5 py-1 rounded-full border transition-colors " +
        (on
          ? "bg-ember text-paper border-ember"
          : "border-ink/15 text-ink-muted hover:border-ink hover:text-ink")
      }
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      {on ? "Bokmärkt" : "Bokmärk"}
    </button>
  );
}
