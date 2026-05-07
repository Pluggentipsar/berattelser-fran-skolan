"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

type NavLink = { href: string; label: string; desc?: string };

const PRIMARY: NavLink[] = [
  { href: "/berattelser", label: "Alla berättelser" },
  { href: "/sok", label: "Sök" },
];

const MEGA: { heading: string; tagline: string; links: NavLink[] }[] = [
  {
    heading: "Läs rösterna",
    tagline: "Texten själv. Och vägar in i den.",
    links: [
      { href: "/las", label: "Läs hela boken", desc: "Sammanhängande läsläge · TTS · distraktionsfritt" },
      { href: "/berattelser", label: "Alla berättelser", desc: "Bläddra · filtrera · läs" },
      { href: "/teman", label: "Teman", desc: "Återkommande mönster" },
      { href: "/citatmur", label: "Citatmuren", desc: "Filtrerbar mur av pull-quotes" },
      { href: "/mosaiken", label: "Mosaiken", desc: "Hundratals citat, simultant" },
      { href: "/bokmarken", label: "Bokmärken", desc: "Sparat i din webbläsare" },
    ],
  },
  {
    heading: "Utforska mönstren",
    tagline: "Vad säger korpusen som helhet?",
    links: [
      { href: "/karta", label: "Sverige-kartan", desc: "Var berättas det ifrån?" },
      { href: "/tidslinje", label: "Tidslinje", desc: "Decennium för decennium" },
      { href: "/floden", label: "Flöden", desc: "Sankey: roll → kritik → förslag" },
      { href: "/fingeravtryck", label: "Fingeravtryck", desc: "Statistik och vokabulär" },
    ],
  },
  {
    heading: "Påverka",
    tagline: "Material för debatt och dialog.",
    links: [
      { href: "/forslag", label: "Folklig reformagenda", desc: "Vad rösterna gemensamt föreslår" },
      { href: "/jamfor", label: "Jämför mot rösterna", desc: "Klistra in ett uttalande" },
      { href: "/ladda-ner", label: "Ladda ner volymerna", desc: "PDF · sprid fritt" },
    ],
  },
];

const META: NavLink[] = [
  { href: "/om", label: "Om sajten" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="border-b border-ink/10 bg-paper/95 sticky top-0 backdrop-blur z-30 print:hidden">
      <div className="max-w-wide mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight whitespace-nowrap">
          Berättelser från skolan
        </Link>
        <nav className="flex items-center gap-5 text-sm font-sans text-ink-soft">
          {PRIMARY.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "hover:text-ink transition-colors " +
                (isActive(l.href) ? "text-ink font-medium" : "")
              }
            >
              {l.label}
            </Link>
          ))}
          <button
            ref={triggerRef}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="utforska-meny"
            className={
              "inline-flex items-center gap-1 hover:text-ink transition-colors " +
              (open ? "text-ink font-medium" : "")
            }
          >
            Utforska
            <svg
              width="9"
              height="9"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={"transition-transform " + (open ? "rotate-180" : "")}
            >
              <polyline points="2 4 6 8 10 4" />
            </svg>
          </button>
          <Link
            href="/om"
            className={
              "hover:text-ink transition-colors " +
              (isActive("/om") ? "text-ink font-medium" : "")
            }
          >
            Om
          </Link>
          <ThemeToggle />
        </nav>
      </div>

      {open && (
        <div
          id="utforska-meny"
          className="absolute left-0 right-0 top-full bg-paper border-b border-ink/10 shadow-xl"
        >
          <button
            type="button"
            aria-label="Stäng meny"
            ref={closeBtnRef}
            onClick={() => setOpen(false)}
            className="absolute top-3 right-6 w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 hover:border-ink hover:text-ember text-sm"
          >
            ×
          </button>
          <div className="max-w-wide mx-auto px-6 py-12 grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            {MEGA.map((col) => (
              <section key={col.heading}>
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-2">
                  {col.heading}
                </p>
                <p className="font-serif italic text-sm text-ink-muted mb-5">
                  {col.tagline}
                </p>
                <ul className="space-y-3.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group block border-l-2 border-ink/10 pl-4 hover:border-ember transition-colors"
                      >
                        <div className="font-display text-base font-semibold text-ink group-hover:text-ember">
                          {l.label} <span className="text-ember opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </div>
                        {l.desc && (
                          <div className="font-serif text-sm text-ink-muted leading-snug mt-0.5">
                            {l.desc}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      {open && (
        <button
          type="button"
          aria-label="Stäng meny"
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-[64px] bg-ink/30 backdrop-blur-[1px] -z-10 cursor-default"
        />
      )}
    </header>
  );
}
