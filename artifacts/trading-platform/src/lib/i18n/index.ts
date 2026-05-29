import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { LOCALE_OVERRIDES } from "./locales/overrides";
import { deepMergeLocale } from "./merge-locale";
import { LOCALE_STORAGE_KEY, SUPPORTED_LANGUAGES, isRtlLocale, type LocaleCode } from "./languages";

function readStoredLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
      return stored as LocaleCode;
    }
  } catch {
    // ignore
  }
  return "en";
}

function applyDocumentLocale(code: string) {
  document.documentElement.lang = code;
  document.documentElement.dir = isRtlLocale(code) ? "rtl" : "ltr";
}

const resources: Record<string, { translation: typeof en }> = {
  en: { translation: en },
};

for (const [code, overrides] of Object.entries(LOCALE_OVERRIDES)) {
  resources[code] = { translation: deepMergeLocale(en, overrides) };
}

const initialLocale = typeof window !== "undefined" ? readStoredLocale() : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

if (typeof window !== "undefined") {
  applyDocumentLocale(initialLocale);
  i18n.on("languageChanged", applyDocumentLocale);
}

export function changeAppLanguage(code: LocaleCode) {
  localStorage.setItem(LOCALE_STORAGE_KEY, code);
  void i18n.changeLanguage(code);
}

export default i18n;
