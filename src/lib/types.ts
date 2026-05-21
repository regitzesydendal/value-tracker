export type FieldKey = "serial" | "version" | "set" | "boughtFor";

export type Category = {
  id: string;
  name: string;
  fields: FieldKey[];
  order: number;
};

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

export const TOTAL_CATEGORY_ID = "__total__";
