"use client";
import Link from "next/link";
import { useState } from "react";
import { formatVolumeRef } from "@/lib/format";

type Proposal = {
  proposal: string;
  total: number;
  byRole: Record<string, number>;
  roleBreadth: number;
  examples: { id: string; title: string; pull_quote: string | null; role: string | null }[];
};

const ROLE_COLORS: Record<string, string> = {
  lärare: "rgb(194 65 12 / 0.85)",       // ember
  förälder: "rgb(67 56 202 / 0.85)",     // indigo
  elev: "rgb(21 128 61 / 0.85)",         // green
  specialpedagog: "rgb(157 23 77 / 0.85)", // pink
  förskollärare: "rgb(180 83 9 / 0.85)",  // amber
  skolledare: "rgb(4 116 138 / 0.85)",    // cyan
  annan: "rgb(107 97 85 / 0.85)",         // ink-muted
};

export function ProposalsBoard({
  proposals,
  rolesInCorpus,
}: {
  proposals: Proposal[];
  rolesInCorpus: string[];
}) {
  const [sortMode, setSortMode] = useState<"weighted" | "frequency" | "breadth">(
    "weighted",
  );

  const sorted = [...proposals].sort((a, b) => {
    if (sortMode === "frequency") return b.total - a.total;
    if (sortMode === "breadth")
      return b.roleBreadth - a.roleBreadth || b.total - a.total;
    // weighted (default)
    const sa = a.total + a.roleBreadth * 8;
    const sb = b.total + b.roleBreadth * 8;
    return sb - sa;
  });

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3 mb-8 border-y border-ink/10 py-4">
        <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2">
          Sortera efter:
        </span>
        <SortButton active={sortMode === "weighted"} onClick={() => setSortMode("weighted")}>
          Frekvens × bredd
        </SortButton>
        <SortButton active={sortMode === "frequency"} onClick={() => setSortMode("frequency")}>
          Bara frekvens
        </SortButton>
        <SortButton active={sortMode === "breadth"} onClick={() => setSortMode("breadth")}>
          Bara röstbredd
        </SortButton>
        <Legend roles={rolesInCorpus} />
      </div>

      <ol className="space-y-12">
        {sorted.map((p, i) => (
          <article
            key={p.proposal}
            className="grid lg:grid-cols-[80px_1fr] gap-x-8 gap-y-4 pb-12 border-b border-ink/10"
          >
            <div className="lg:text-right">
              <div className="font-display text-5xl font-semibold tabular-nums text-ember leading-none">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="font-mono text-xs text-ink-faint mt-2 tabular-nums">
                {p.total} röster
              </div>
              <div className="font-mono text-xs text-ink-faint tabular-nums">
                {p.roleBreadth} roller
              </div>
            </div>
            <div>
              <h2
                className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-4 leading-tight"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 25' }}
              >
                {prettyProposal(p.proposal)}
              </h2>
              <RoleStack byRole={p.byRole} total={p.total} />
              <div className="space-y-4 mt-6">
                {p.examples.map((ex) => (
                  <Link
                    key={ex.id}
                    href={`/berattelser/${ex.id}`}
                    className="block group border-l-2 border-ember/40 pl-4 hover:border-ember"
                  >
                    {ex.pull_quote ? (
                      <p className="font-serif italic text-ink-soft group-hover:text-ink leading-relaxed">
                        &ldquo;{ex.pull_quote}&rdquo;
                      </p>
                    ) : (
                      <p className="font-serif text-ink-soft italic">
                        ({ex.title})
                      </p>
                    )}
                    <div className="font-sans text-xs text-ink-muted mt-1.5 flex items-baseline gap-2 flex-wrap">
                      {ex.role && <span>{ex.role}</span>}
                      <span className="ml-auto text-ink-faint">
                        Ur &ldquo;{ex.title}&rdquo;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <Link
                  href={`/berattelser?proposal=${encodeURIComponent(p.proposal)}`}
                  className="font-sans text-sm text-ink-soft hover:text-ember underline"
                >
                  Läs alla {p.total} berättelser som föreslår detta →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </ol>
    </>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "font-sans text-xs px-3 py-1.5 rounded-full border transition-colors " +
        (active
          ? "bg-ink text-paper border-ink"
          : "border-ink/15 text-ink-soft hover:border-ink hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function Legend({ roles }: { roles: string[] }) {
  return (
    <div className="ml-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 font-sans text-xs">
      {roles.slice(0, 6).map((r) => (
        <span key={r} className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ background: ROLE_COLORS[r] ?? ROLE_COLORS.annan }}
          />
          <span className="text-ink-muted">{r}</span>
        </span>
      ))}
    </div>
  );
}

function RoleStack({
  byRole,
  total,
}: {
  byRole: Record<string, number>;
  total: number;
}) {
  const entries = Object.entries(byRole)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-1.5 mb-1">
      <div className="flex h-3 rounded-sm overflow-hidden bg-paper-deep">
        {entries.map(([role, n]) => (
          <div
            key={role}
            title={`${role}: ${n}`}
            style={{
              width: `${(n / total) * 100}%`,
              background: ROLE_COLORS[role] ?? ROLE_COLORS.annan,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-xs text-ink-muted">
        {entries.map(([role, n]) => (
          <span key={role}>
            <span className="font-medium text-ink-soft">{n}</span> {role}
          </span>
        ))}
      </div>
    </div>
  );
}

function prettyProposal(s: string): string {
  // "fler-vuxna-i-skolan" → "Fler vuxna i skolan"
  return s
    .replace(/-/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bnpf\b/gi, "NPF")
    .replace(/\bsva\b/gi, "SVA")
    .replace(/\bbup\b/gi, "BUP");
}
