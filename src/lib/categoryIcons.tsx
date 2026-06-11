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
