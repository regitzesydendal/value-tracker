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
