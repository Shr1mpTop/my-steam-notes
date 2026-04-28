import { createContext } from "react";

export type Locale = "zh" | "en";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);
