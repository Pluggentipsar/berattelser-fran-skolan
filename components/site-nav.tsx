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

export function SiteNav() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = megaOpen || mobileOpen;

  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        setMobileOpen(false);
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
      <div className="max-w-wide mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-base sm:text-lg font-semibold tracking-tight whitespace-nowrap shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          Berättelser från skolan
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-sans text-ink-soft">
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
            onClick={() => setMegaOpen((v) => !v)}
            aria-expanded={megaOpen}
            aria-controls="utforska-meny"
            className={
              "inline-flex items-center gap-1 hover:text-ink transition-colors " +
              (megaOpen ? "text-ink font-medium" : "")
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
              className={"transition-transform " + (megaOpen ? "rotate-180" : "")}
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

        {/* Mobile trigger */}
        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobil-meny"
            aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-ink/15 hover:border-ink text-ink-soft hover:text-ink transition-colors"
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Desktop mega-menu panel */}
      {megaOpen && (
        <div
          id="utforska-meny"
          className="absolute left-0 right-0 top-full bg-paper border-b border-ink/10 shadow-xl hidden lg:block"
        >
          <button
            type="button"
            aria-label="Stäng meny"
            ref={closeBtnRef}
            onClick={() => setMegaOpen(false)}
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
                          {l.label}{" "}
                          <span className="text-ember opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          id="mobil-meny"
          className="lg:hidden fixed inset-0 top-[60px] bg-paper overflow-y-auto z-40"
        >
          <nav className="px-5 py-6 pb-20">
            <div className="grid gap-1 mb-6 pb-5 border-b border-ink/10">
              {PRIMARY.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "font-display text-xl py-2 hover:text-ember " +
                    (isActive(l.href) ? "text-ember font-semibold" : "text-ink")
                  }
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/om"
                className={
                  "font-display text-xl py-2 hover:text-ember " +
                  (isActive("/om") ? "text-ember font-semibold" : "text-ink")
                }
              >
                Om sajten
              </Link>
            </div>
            {MEGA.map((col, i) => (
              <section key={col.heading} className={i > 0 ? "mt-7" : ""}>
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-1">
                  {col.heading}
                </p>
                <p className="font-serif italic text-sm text-ink-muted mb-3">
                  {col.tagline}
                </p>
                <ul className="grid gap-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className={
                          "block py-2 border-l-2 pl-3 transition-colors " +
                          (isActive(l.href)
                            ? "border-ember text-ember"
                            : "border-ink/10 hover:border-ember")
                        }
                      >
                        <div className="font-display text-base font-semibold">
                          {l.label}
                        </div>
                        {l.desc && (
                          <div className="font-serif text-xs text-ink-muted leading-snug mt-0.5">
                            {l.desc}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop backdrop for mega-menu */}
      {megaOpen && (
        <button
          type="button"
          aria-label="Stäng meny"
          onClick={() => setMegaOpen(false)}
          className="hidden lg:block fixed inset-0 top-[64px] bg-ink/30 backdrop-blur-[1px] -z-10 cursor-default"
        />
      )}
    </header>
  );
}
