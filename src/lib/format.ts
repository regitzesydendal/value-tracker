const dkk = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

export function formatDKK(amount: number | undefined | null): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return dkk.format(amount);
}

export function parseAmount(input: string): number | undefined {
  if (!input) return undefined;
  const cleaned = input
    .replace(/kr\.?/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}
