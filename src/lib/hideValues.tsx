import { createContext, useContext, useState, type ReactNode } from "react";

// Global "skjul beløb" (anonymise) toggle. When on, every monetary figure on
// the page — the big totals and the individual item values — is replaced with a
// star mask so you can show the screen without revealing the numbers. The choice
// is persisted so it survives reloads.

const KEY = "vt:hideValues";

// Star mask shown instead of a real number when values are hidden.
export const MONEY_MASK = "✦✦✦";

type Ctx = {
  hidden: boolean;
  toggle: () => void;
  /** Returns the star mask when hidden, otherwise the given text unchanged. */
  mask: (text: string) => string;
};

const HideValuesContext = createContext<Ctx>({
  hidden: false,
  toggle: () => {},
  mask: (t) => t,
});

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore storage errors (e.g. private mode) */
      }
      return next;
    });
  }

  const mask = (text: string) => (hidden ? MONEY_MASK : text);

  return (
    <HideValuesContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </HideValuesContext.Provider>
  );
}

export function useHideValues() {
  return useContext(HideValuesContext);
}

// Shared eye / eye-off icons used by the toggle button.
export function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M6.61 6.61A18.45 18.45 0 0 0 1 12s4 8 11 8a9.12 9.12 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
