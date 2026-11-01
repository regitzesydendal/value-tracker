import type { CSSProperties } from "react";

// Shiny metal: a diagonal gradient with a bright highlight band in the middle.
function metal(dark: string, mid: string, light: string, edge: string, text: string): CSSProperties {
  return {
    backgroundImage: `linear-gradient(135deg, ${dark} 0%, ${mid} 30%, ${light} 50%, ${mid} 70%, ${dark} 100%)`,
    border: `1px solid ${edge}`,
    color: text,
    textShadow: "0 1px 0 rgba(255,255,255,0.45)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 1px rgba(0,0,0,0.15)",
  };
}

const styles: Record<string, CSSProperties> = {
  "psa 8": metal("#7a4a1f", "#c98544", "#f6cfa0", "#6b3f17", "#3d2208"), // bronze
  "psa 9": metal("#7f858d", "#c3c8ce", "#ffffff", "#6f757c", "#2f3338"), // silver
  "psa 10": metal("#8a6512", "#d4a537", "#fff3b8", "#7a580c", "#4a3404"), // gold
  // Cardboard box: kraft-brown with a strip of packing tape down the middle
  // and a darker flap seam along the top.
  sealed: {
    backgroundColor: "#c79a62",
    backgroundImage: [
      "linear-gradient(90deg, transparent 38%, rgba(240,214,160,0.85) 38%, rgba(240,214,160,0.85) 62%, transparent 62%)",
      "linear-gradient(180deg, rgba(90,55,20,0.35) 0, rgba(90,55,20,0.35) 2px, transparent 2px)",
      "repeating-linear-gradient(90deg, rgba(120,80,35,0.08) 0 1px, transparent 1px 3px)",
    ].join(","),
    border: "1px solid #9a7240",
    color: "#3f2710",
  },
  raw: {
    backgroundColor: "#f5f5f5",
    border: "1px solid #d4d4d4",
    color: "#525252",
  },
};

const fallback: CSSProperties = { backgroundColor: "#262626", color: "#fff" };

// Tiny graded-card "slab": a case with a label strip on top and the card below.
function SlabIcon() {
  return (
    <svg width="9" height="12" viewBox="0 0 9 12" aria-hidden className="shrink-0">
      <rect x="0.5" y="0.5" width="8" height="11" rx="1.2" fill="rgba(255,255,255,0.55)" stroke="currentColor" strokeWidth="0.9" />
      <rect x="1.6" y="1.6" width="5.8" height="2" rx="0.4" fill="currentColor" />
      <rect x="2" y="4.6" width="5" height="5.8" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  const key = grade.trim().toLowerCase();
  const isGraded = /^(psa|bgs|cgc|sgc)\b/.test(key);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={styles[key] ?? fallback}
      title="Stand / grade"
    >
      {isGraded && <SlabIcon />}
      {grade}
    </span>
  );
}

// Small folder glyph for generic folder tags.
function FolderIcon() {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden className="shrink-0">
      <path d="M0.5 1.5 a1 1 0 0 1 1-1 h2.6 l1 1.2 h4.4 a1 1 0 0 1 1 1 v4.8 a1 1 0 0 1-1 1 h-8 a1 1 0 0 1-1-1z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

const gradient = (from: string, to: string, edge: string, text: string): CSSProperties => ({
  backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
  border: `1px solid ${edge}`,
  color: text,
});

// Tag for a folder inside a container (e.g. the Collectr portfolios), styled
// after what the folder holds — slabs, sealed, for sale, promos, a master set.
const folderKinds: { test: RegExp; label: string; style: CSSProperties; icon: () => React.ReactNode }[] = [
  { test: /slab|psa|graded/i, label: "Slabs", style: styles["psa 9"], icon: SlabIcon },
  { test: /sealed/i, label: "Sealed", style: styles.sealed, icon: () => null },
  { test: /sale|salg/i, label: "Til salg", style: gradient("#d1fae5", "#6ee7b7", "#34d399", "#065f46"), icon: () => <span aria-hidden>🏷️</span> },
  { test: /promo/i, label: "Promo", style: gradient("#ede9fe", "#c4b5fd", "#a78bfa", "#4c1d95"), icon: () => <span aria-hidden>★</span> },
  { test: /master\s*set/i, label: "Masterset", style: gradient("#dbeafe", "#93c5fd", "#60a5fa", "#1e3a8a"), icon: () => <span aria-hidden>◆</span> },
  { test: /condition|played|damaged/i, label: "Slidte", style: gradient("#fef3c7", "#fcd34d", "#f59e0b", "#78350f"), icon: () => <span aria-hidden>⚠</span> },
  { test: /\bny|nye|new\b/i, label: "Nye", style: gradient("#dcfce7", "#86efac", "#4ade80", "#14532d"), icon: () => <span aria-hidden>✦</span> },
  { test: /one\s*piece/i, label: "One Piece", style: gradient("#fee2e2", "#fca5a5", "#f87171", "#7f1d1d"), icon: () => <span aria-hidden>☠</span> },
];

export function FolderBadge({ name }: { name: string }) {
  const kind = folderKinds.find((k) => k.test.test(name));
  const style = kind?.style ?? gradient("#f1f5f9", "#cbd5e1", "#94a3b8", "#334155");
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={style}
      title="Mappe"
    >
      {kind ? kind.icon() : <FolderIcon />}
      {kind?.label ?? "Mappe"}
    </span>
  );
}
