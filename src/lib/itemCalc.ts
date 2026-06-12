import type { Item } from "./types";

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
