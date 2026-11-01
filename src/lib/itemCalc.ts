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
