import type { AppData, Item } from "./types";

// An item's value/cost is per-unit; multiply by quantity for the line total.
// quantity defaults to 1 (older items have no quantity set).

export function itemQuantity(i: Pick<Item, "quantity">): number {
  return i.quantity != null && i.quantity > 0 ? i.quantity : 1;
}

export function itemTotalValue(i: Pick<Item, "currentValue" | "quantity">): number {
  return (i.currentValue || 0) * itemQuantity(i);
}

export function itemTotalBought(
  i: Pick<Item, "boughtFor" | "quantity">,
): number | null {
  return i.boughtFor == null ? null : i.boughtFor * itemQuantity(i);
}

// A container that holds items is worth the sum of what's inside it (nested
// containers included), so e.g. "Collectr" always matches its cards. Containers
// without children keep their own typed-in value.
export function rollUpContainers(data: AppData): AppData {
  const kids = new Map<string, Item[]>();
  for (const it of data.items) {
    if (!it.parentId) continue;
    const arr = kids.get(it.parentId) ?? [];
    arr.push(it);
    kids.set(it.parentId, arr);
  }
  if (kids.size === 0) return data;

  const memo = new Map<string, number>();
  const valueOf = (it: Item): number => {
    const children = it.isContainer ? kids.get(it.id) : undefined;
    if (!children?.length) return itemTotalValue(it);
    const cached = memo.get(it.id);
    if (cached != null) return cached;
    memo.set(it.id, 0); // guards against accidental cycles
    const sum = children.reduce((s, c) => s + valueOf(c), 0);
    memo.set(it.id, sum);
    return sum;
  };

  return {
    ...data,
    items: data.items.map((it) =>
      it.isContainer && kids.get(it.id)?.length
        ? { ...it, currentValue: valueOf(it), quantity: 1 }
        : it,
    ),
  };
}

// True for a container that currently holds items (e.g. "Collectr"). Those are
// shown as their own collection rather than inside a category.
export function hasChildren(item: Item, items: Item[]): boolean {
  return !!item.isContainer && items.some((i) => i.parentId === item.id);
}

// Value per category counting every real item wherever it lives — cards inside
// containers count toward their OWN category (so One Piece cards inside
// "Collectr" count as One Piece). Containers that hold items are skipped,
// since their value is just the sum of those items.
export function valueByLeafCategory(items: Item[]): Map<string, number> {
  const parents = new Set(items.filter((i) => i.parentId).map((i) => i.parentId!));
  const totals = new Map<string, number>();
  for (const it of items) {
    if (it.isContainer && parents.has(it.id)) continue;
    totals.set(it.categoryId, (totals.get(it.categoryId) ?? 0) + itemTotalValue(it));
  }
  return totals;
}
