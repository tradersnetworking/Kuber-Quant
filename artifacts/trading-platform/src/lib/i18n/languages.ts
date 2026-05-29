export type LocaleCode =
  | "en" | "hi" | "bn" | "te" | "ta" | "mr" | "gu" | "kn" | "ml" | "pa" | "or" | "as" | "ur"
  | "es" | "fr" | "de" | "ar" | "zh" | "pt" | "ru" | "ja" | "ko" | "id" | "tr" | "vi" | "th" | "it";

export interface LanguageOption {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  group: "international" | "indian";
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", group: "international" },
  { code: "es", label: "Spanish", nativeLabel: "Español", group: "international" },
  { code: "fr", label: "French", nativeLabel: "Français", group: "international" },
  { code: "de", label: "German", nativeLabel: "Deutsch", group: "international" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", group: "international" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", group: "international" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", group: "international" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", group: "international" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", group: "international" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", group: "international", rtl: true },
  { code: "it", label: "Italian", nativeLabel: "Italiano", group: "international" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", group: "international" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", group: "international" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", group: "international" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", group: "international" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", group: "indian" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", group: "indian" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", group: "indian" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", group: "indian" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", group: "indian" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", group: "indian" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", group: "indian" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം", group: "indian" },
  { code: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", group: "indian" },
  { code: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ", group: "indian" },
  { code: "as", label: "Assamese", nativeLabel: "অসমীয়া", group: "indian" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", group: "indian", rtl: true },
];

export const LOCALE_STORAGE_KEY = "kq-locale";

export function getLanguageMeta(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

export function isRtlLocale(code: string): boolean {
  return !!getLanguageMeta(code)?.rtl;
}
