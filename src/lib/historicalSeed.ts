// One-time backfill of historical category totals from the user's spreadsheet
// (March 2026 and April 2026). The user clicks "Indlæs historisk data" once
// to populate the snapshots table.
//
// "Today" is rendered from the live items in the database, so we do NOT seed a
// May snapshot here.

import { TOTAL_CATEGORY_ID } from "./types";

export type SeedSnapshot = {
  date: string;        // YYYY-MM-DD
  categoryId: string;  // category.id, or TOTAL_CATEGORY_ID
  value: number;
};

export const historicalSnapshots: SeedSnapshot[] = [
  // ----- March 2026 (OP was not tracked yet) -----
  { date: "2026-03-15", categoryId: "pokemon", value: 130975 },
  { date: "2026-03-15", categoryId: "fodbold", value: 24530 },
  { date: "2026-03-15", categoryId: "basketball", value: 379 },
  { date: "2026-03-15", categoryId: TOTAL_CATEGORY_ID, value: 155884 },

  // ----- April 2026 -----
  { date: "2026-04-15", categoryId: "pokemon", value: 140475 },
  { date: "2026-04-15", categoryId: "op", value: 6100 },
  { date: "2026-04-15", categoryId: "fodbold", value: 28780 },
  { date: "2026-04-15", categoryId: "basketball", value: 379 },
  { date: "2026-04-15", categoryId: TOTAL_CATEGORY_ID, value: 175734 },
];
