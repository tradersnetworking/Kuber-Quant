import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, LOCALE_STORAGE_KEY, type LocaleCode } from "@/lib/i18n/languages";
import { changeAppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  /** Icon-only on the narrowest screens to avoid overlapping the brand row */
  compact?: boolean;
  /** Always show locale code beside the globe (mobile brand bar) */
  inline?: boolean;
  /** Tight icon-only trigger for the mobile brand bar (globe only, no EN label) */
  brandBar?: boolean;
  className?: string;
};

export function LanguageSelector({ compact = false, inline = false, brandBar = false, className }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    const stored = (localStorage.getItem(LOCALE_STORAGE_KEY) || i18n.language || "en") as LocaleCode;
    setLocale(stored);
  }, [i18n.language]);

  const international = SUPPORTED_LANGUAGES.filter(l => l.group === "international");
  const indian = SUPPORTED_LANGUAGES.filter(l => l.group === "indian");
  const current = SUPPORTED_LANGUAGES.find(l => l.code === locale);

  return (
    <Select
      value={locale}
      onValueChange={(v) => {
        const code = v as LocaleCode;
        setLocale(code);
        changeAppLanguage(code);
      }}
    >
      <SelectTrigger
        className={cn(
          brandBar
            ? "h-8 w-[2.75rem] min-w-[2.75rem] max-w-[2.75rem] px-1 gap-0.5 justify-center border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 shrink-0 text-[9px] [&>svg:last-child]:hidden overflow-hidden"
            : inline
            ? "h-8 min-w-[3.25rem] max-w-[4.5rem] px-1.5 gap-1 border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 shrink-0 text-[10px] [&>svg:last-child]:hidden"
            : compact
              ? "h-9 w-9 p-0 justify-center gap-0 border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 shrink-0 [&>svg:last-child]:hidden sm:w-auto sm:min-w-[4.5rem] sm:px-2 sm:gap-1 sm:[&>svg:last-child]:block"
              : "h-9 w-[7.5rem] sm:w-[130px] border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 text-xs shrink-0",
          className,
        )}
        aria-label={t("language.select", { defaultValue: "Select language" })}
        title={brandBar ? (current?.code ?? locale).toUpperCase() : undefined}
      >
        <Globe className={cn("h-3 w-3 text-muted-foreground shrink-0", brandBar || inline ? "" : compact ? "mx-auto sm:mx-0" : "mr-1")} />
        {brandBar ? (
          <span className="font-bold uppercase leading-none truncate max-w-[1.25rem] text-[9px]">
            {current?.code ?? locale}
          </span>
        ) : inline ? (
          <span className="truncate font-semibold uppercase max-w-[2.5rem]">
            {current?.code ?? locale}
          </span>
        ) : compact ? (
          <span className="hidden sm:inline truncate text-[10px] font-medium uppercase">
            {current?.code ?? locale}
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className="max-h-[min(420px,70vh)]">
        <SelectGroup>
          <SelectLabel>{t("language.international")}</SelectLabel>
          {international.map(l => (
            <SelectItem key={l.code} value={l.code}>
              {l.nativeLabel}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{t("language.indianLanguages")}</SelectLabel>
          {indian.map(l => (
            <SelectItem key={l.code} value={l.code}>
              {l.nativeLabel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
