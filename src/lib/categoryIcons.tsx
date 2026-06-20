// Per-category logos. A category's `icon` is either an emoji (e.g. "⚽") or the
// special token "pokeball", which we draw as an SVG since there's no Pokéball
// emoji. When a category has no icon set, we guess a sensible one from its name
// so the user's existing categories get logos automatically.

export const CATEGORY_ICON_CHOICES: string[] = [
  "pokeball", // drawn as SVG below
  "🏴‍☠️",     // One Piece — jolly roger
  "👒",       // straw hat
  "⚽",       // football
  "🏀",       // basketball
  "💰",       // cash / likvider
  "💵",
  "🎴",       // playing card
  "🃏",
  "⭐",
  "🔥",
  "💎",
];

export function guessIconKey(name: string): string | undefined {
  const n = name.toLowerCase();
  if (/pok[eé]|pokemon|pokémon/.test(n)) return "pokeball";
  if (/one ?piece|luffy|straw|pirat|jolly/.test(n)) return "🏴‍☠️";
  if (/fodbold|football|soccer/.test(n)) return "⚽";
  if (/basket/.test(n)) return "🏀";
  if (/likvid|kontant|penge|cash|money/.test(n)) return "💰";
  return undefined;
}

// Guess a category color from its name, mirroring the icon guesses.
export function guessCategoryColor(name: string): string | undefined {
  const n = name.toLowerCase();
  if (/pok[eé]|pokemon|pokémon/.test(n)) return "#ef4444"; // red
  if (/one ?piece|luffy|straw|pirat|jolly/.test(n)) return "#f59e0b"; // amber/yellow
  if (/fodbold|football|soccer/.test(n)) return "#16a34a"; // green
  if (/basket/.test(n)) return "#f97316"; // orange
  if (/likvid|kontant|penge|cash|money/.test(n)) return "#3b82f6"; // blue
  return undefined;
}

// Explicit color first, else a guess from the name.
export function resolveCategoryColor(category: {
  name: string;
  color?: string;
}): string | undefined {
  return category.color ?? guessCategoryColor(category.name);
}

function PokeballIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="#fff" />
      <path d="M2 12 A10 10 0 0 1 22 12 Z" fill="#ef4444" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="#111" strokeWidth="1.5" />
      <line x1="2.2" y1="12" x2="21.8" y2="12" stroke="#111" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.2" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.2" fill="#fff" stroke="#111" strokeWidth="1" />
    </svg>
  );
}

// Container emblem ("Collectr" etc.) — a starry-night "C" matching the page
// background: deep-blue night disc, a gold sweeping C, a swirl and a star.
// Containers can hold cards from several categories, so they get their own mark
// instead of any single category's icon.
export function ContainerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="11" fill="#11264d" stroke="#f5c542" strokeWidth="1.2" />
      <path d="M5 14 Q9 9 13 12" fill="none" stroke="#5b8cc0" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M16.6 8 A5.2 5.2 0 1 0 16.6 16" fill="none" stroke="#f5c542" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M17.6 6.4 l0.5 1.4 1.4 0.5 -1.4 0.5 -0.5 1.4 -0.5 -1.4 -1.4 -0.5 1.4 -0.5 Z" fill="#fff7df" />
    </svg>
  );
}

// Render an icon token (emoji or "pokeball") at a given pixel size.
export function renderCategoryIcon(
  token: string | undefined,
  sizePx = 18,
): React.ReactNode {
  if (!token) return null;
  if (token === "pokeball") return <PokeballIcon size={sizePx} />;
  return (
    <span
      style={{ fontSize: sizePx, lineHeight: 1 }}
      className="shrink-0 leading-none"
    >
      {token}
    </span>
  );
}

// Resolve a category's icon: explicit choice first, else a guess from the name.
export function resolveCategoryIcon(category: {
  name: string;
  icon?: string;
}): string | undefined {
  return category.icon ?? guessIconKey(category.name);
}

export function CategoryIcon({
  category,
  size = 18,
}: {
  category: { name: string; icon?: string };
  size?: number;
}) {
  return <>{renderCategoryIcon(resolveCategoryIcon(category), size)}</>;
}
