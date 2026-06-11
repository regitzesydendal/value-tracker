export type FieldKey = "serial" | "version" | "set" | "boughtFor";

export type Category = {
  id: string;
  name: string;
  fields: FieldKey[];
  order: number;
  color?: string; // hex string, e.g. "#f59e0b" — used for sidebar dot + row accent
  icon?: string;  // emoji or "pokeball" token — see lib/categoryIcons
};

// Where the physical item lives. Stored as a string in the DB, but the UI
// restricts new entries to this fixed list.
export type ItemLocation =
  | "home"
  | "parents"
  | "digital"
  | "incoming"
  | "other";

export const itemLocationLabels: Record<ItemLocation, string> = {
  home: "Hjemme",
  parents: "Hos forældre",
  digital: "Digital",
  incoming: "På vej",
  other: "Andet",
};

export const itemLocationOrder: ItemLocation[] = [
  "home",
  "parents",
  "digital",
  "incoming",
  "other",
];

export type Item = {
  id: string;
  categoryId: string;
  name: string;
  serial?: string;
  version?: string;
  set?: string;
  boughtFor?: number;
  currentValue: number;
  notes?: string;
  isPending?: boolean; // "Ingående lager" — potential buy / incoming stock
  marketplaceUrl?: string; // e.g. Cardmarket / TCGPlayer / eBay listing URL
  isContainer?: boolean; // true = can have child items (e.g. "Collectr" holding many cards)
  parentId?: string;     // points to another item.id if this is a child
  wantMore?: boolean;          // "I want to buy more of this"
  desiredBuyPrice?: number;    // the price I'd be willing to pay (kr.)
  forSale?: boolean;           // "currently listed for sale"
  askingPrice?: number;        // the price I'm asking for (kr.)
  location?: ItemLocation;     // where the item physically lives
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  categories: Category[];
  items: Item[];
};

export type Snapshot = {
  id: string;
  date: string;          // ISO date (YYYY-MM-DD)
  categoryId: string;    // '__total__' for grand-total rows
  value: number;
  notes?: string;
};

// "Ønskeliste" — things the user wants to buy. Kept separate from the
// collection so it never counts toward net worth.
export type WishlistPriority = "high" | "medium" | "low";

export const wishlistPriorityLabels: Record<WishlistPriority, string> = {
  high: "Høj",
  medium: "Mellem",
  low: "Lav",
};

export const wishlistPriorityOrder: WishlistPriority[] = ["high", "medium", "low"];

export type WishlistItem = {
  id: string;
  name: string;
  price?: number;          // expected price per unit (kr.)
  quantity: number;
  expectedDate?: string;   // ISO date (YYYY-MM-DD)
  priority?: WishlistPriority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const TOTAL_CATEGORY_ID = "__total__";
