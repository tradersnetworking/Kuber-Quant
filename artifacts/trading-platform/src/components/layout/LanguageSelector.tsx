import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

export function LanguageSelector() {
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    setLocale(localStorage.getItem("kq-locale") || "en");
  }, []);

  return (
    <Select
      value={locale}
      onValueChange={(v) => {
        localStorage.setItem("kq-locale", v);
        setLocale(v);
      }}
    >
      <SelectTrigger className="h-9 w-[110px] border-white/10 bg-white/5 text-xs">
        <Globe className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
