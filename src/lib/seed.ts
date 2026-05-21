import type { AppData, Item } from "./types";

const now = new Date().toISOString();
const mk = (
  partial: Omit<Item, "id" | "createdAt" | "updatedAt">,
  i: number,
): Item => ({
  id: `seed-${partial.categoryId}-${i}`,
  createdAt: now,
  updatedAt: now,
  ...partial,
});

let i = 0;
const next = () => ++i;

export const seedData: AppData = {
  categories: [
    { id: "likvider", name: "Likvider", fields: ["boughtFor"], order: 0 },
    { id: "pokemon", name: "Pokémonkort", fields: [], order: 1 },
    { id: "op", name: "One Piece", fields: ["version", "set"], order: 2 },
    {
      id: "fodbold",
      name: "Fodboldkort",
      fields: ["serial", "version", "set"],
      order: 3,
    },
    {
      id: "basketball",
      name: "Basketball",
      fields: ["serial", "version", "set"],
      order: 4,
    },
  ],
  items: [
    // Likvider
    mk(
      { categoryId: "likvider", name: "Nordnet", boughtFor: 10000, currentValue: 10000 },
      next(),
    ),
    mk(
      { categoryId: "likvider", name: "Kontanter", boughtFor: 0, currentValue: 2000 },
      next(),
    ),
    mk({ categoryId: "likvider", name: "Euro", currentValue: 7500 }, next()),
    mk({ categoryId: "likvider", name: "Kontoen", currentValue: 2500 }, next()),

    // Pokemon
    mk({ categoryId: "pokemon", name: "Collectr", currentValue: 119000 }, next()),
    mk({ categoryId: "pokemon", name: "Pokedata", currentValue: 17000 }, next()),
    mk({ categoryId: "pokemon", name: "Bulk", currentValue: 125 }, next()),
    mk({ categoryId: "pokemon", name: "Topps trio", currentValue: 600 }, next()),
    mk(
      {
        categoryId: "pokemon",
        name: "Booster display (Ascended Heroes)",
        currentValue: 8700,
        isPending: true,
      },
      next(),
    ),

    // One Piece
    mk({ categoryId: "op", name: "Luffy Gear 5", currentValue: 3300 }, next()),
    mk({ categoryId: "op", name: "Luffy Gear 2", currentValue: 2800 }, next()),
    mk({ categoryId: "op", name: "OP05 Box", currentValue: 5200 }, next()),
    mk({ categoryId: "op", name: "OP09 Box", currentValue: 3000 }, next()),
    mk({ categoryId: "op", name: "OP15 Box", currentValue: 1100 }, next()),
    mk({ categoryId: "op", name: "OP08 Box", currentValue: 1100 }, next()),

    // Football
    mk({ categoryId: "fodbold", name: "Leonardo", serial: "/99", version: "Autograph", set: "Topps Deco", currentValue: 225 }, next()),
    mk({ categoryId: "fodbold", name: "Foden", serial: "/99", version: "Parallel", set: "Topps Deco", currentValue: 35 }, next()),
    mk({ categoryId: "fodbold", name: "Alvarez", serial: "/99", version: "Parallel", set: "Topps Deco", currentValue: 35 }, next()),
    mk({ categoryId: "fodbold", name: "Arda Güler", version: "Base, RC", set: "Topps Deco", currentValue: 20 }, next()),
    mk({ categoryId: "fodbold", name: "R9 & Vini Jr", version: "Base", set: "Topps Deco", currentValue: 20 }, next()),
    mk({ categoryId: "fodbold", name: "Mason Mount", version: "Insert", set: "Qatar 2022", currentValue: 325 }, next()),
    mk({ categoryId: "fodbold", name: "Benzema", serial: "/99", version: "Parallel", set: "Qatar 2022", currentValue: 50 }, next()),
    mk({ categoryId: "fodbold", name: "Zidane", version: "Insert", set: "Qatar 2022", currentValue: 65 }, next()),
    mk({ categoryId: "fodbold", name: "Haaland", version: "Insert", set: "Qatar 2022", currentValue: 30 }, next()),
    mk({ categoryId: "fodbold", name: "Pablo Torre", version: "Insert", set: "Topps Finest", currentValue: 20 }, next()),
    mk({ categoryId: "fodbold", name: "Lewandowski", serial: "/30", version: "Relic", set: "Immaculate 2024/25", currentValue: 150 }, next()),
    mk({ categoryId: "fodbold", name: "David Luiz", serial: "/10", version: "Autograph", set: "Immaculate 2024/25", currentValue: 450 }, next()),
    mk({ categoryId: "fodbold", name: "Diogo Jota", serial: "/10", version: "Autograph", set: "Immaculate 2024/25", currentValue: 750 }, next()),
    mk({ categoryId: "fodbold", name: "K. Mbappé PSA 8", serial: "/1", version: "Autograph", set: "Immaculate 2024/25", currentValue: 0 }, next()),
    mk({ categoryId: "fodbold", name: "Tonali", serial: "/19", version: "Base", set: "Immaculate 2024/25", currentValue: 100 }, next()),
    mk({ categoryId: "fodbold", name: "K. Mbappé", serial: "/19", version: "Base", set: "Immaculate 2024/25", currentValue: 425 }, next()),
    mk({ categoryId: "fodbold", name: "Luis Diaz", serial: "/20", version: "Relic", set: "Immaculate 2024/25", currentValue: 55 }, next()),
    mk({ categoryId: "fodbold", name: "Savinho", serial: "/20", version: "Relic", set: "Immaculate 2024/25", currentValue: 70 }, next()),
    mk({ categoryId: "fodbold", name: "C. Pulisic", version: "Relic, RC", set: "Black Gold 2016/17", currentValue: 650 }, next()),
    mk({ categoryId: "fodbold", name: "Vasilije Adzic", serial: "/99", version: "Parallel", set: "Prizm World Cup 2025", currentValue: 20 }, next()),
    mk({ categoryId: "fodbold", name: "Prizm Blaster", version: "SEALED", set: "2022/23", currentValue: 125 }, next()),
    mk({ categoryId: "fodbold", name: "Cole Palmer", serial: "/125", version: "Parallel", set: "Bowman 2022/23", currentValue: 20 }, next()),
    mk({ categoryId: "fodbold", name: "Francisco Conceição", serial: "/75", version: "Auto", set: "Topps Finest", currentValue: 140 }, next()),

    // Basketball
    mk({ categoryId: "basketball", name: "Yves Missi", serial: "/99", version: "Autograph", set: "Topps Flagship", currentValue: 35 }, next()),
    mk({ categoryId: "basketball", name: "Dillon Brooks", version: "Autograph", set: "Topps Flagship", currentValue: 60 }, next()),
    mk({ categoryId: "basketball", name: "M. Raynoud", version: "Base", set: "Topps Flagship", currentValue: 6 }, next()),
    mk({ categoryId: "basketball", name: "Cooper Flag", version: "No limit Insert", set: "Topps Flagship", currentValue: 50 }, next()),
    mk({ categoryId: "basketball", name: "Karl-Anthony T.", serial: "/99", version: "Parallel", set: "Topps Flagship", currentValue: 10 }, next()),
    mk({ categoryId: "basketball", name: "REDEMPTION", version: "REDEMPTION", currentValue: 20 }, next()),
    mk({ categoryId: "basketball", name: "Pacôme Dadiet", version: "Autograph", set: "Donruss 2024/25", currentValue: 20 }, next()),
    mk({ categoryId: "basketball", name: "OG Anunoby", serial: "/49", version: "Parallel", set: "Donruss 2024/25", currentValue: 6 }, next()),
    mk({ categoryId: "basketball", name: "Karl-Anthony T.", serial: "/149", version: "Parallel", set: "Prizm 2024/25", currentValue: 7 }, next()),
    mk({ categoryId: "basketball", name: "Cooper Flag", version: "Base", set: "Topps Flagship", currentValue: 35 }, next()),
    mk({ categoryId: "basketball", name: "G. Hill", serial: "/99", version: "Auto", set: "Obby 2024/25", currentValue: 20 }, next()),
    mk({ categoryId: "basketball", name: "Pascal S.", serial: "/125", version: "Parallel", set: "Obby 2024/25", currentValue: 10 }, next()),
    mk({ categoryId: "basketball", name: "Pascal S.", serial: "/125", version: "Parallel", set: "Obby 2024/25", currentValue: 10 }, next()),
    mk({ categoryId: "basketball", name: "Myles Turner", serial: "/49", version: "Parallel", set: "Obby 2024/25", currentValue: 20 }, next()),
    mk({ categoryId: "basketball", name: "Giannis A.", serial: "/75", version: "Parallel", set: "Obby 2024/25", currentValue: 70 }, next()),
  ],
};
