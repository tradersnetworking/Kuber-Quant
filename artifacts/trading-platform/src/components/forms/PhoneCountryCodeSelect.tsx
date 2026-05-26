import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ALL_COUNTRY_DIAL_CODES, DEFAULT_DIAL_CODE, findCountryByDialCode } from "@/lib/country-codes";

type Props = {
  value: string;
  onChange: (dialCode: string) => void;
  className?: string;
  disabled?: boolean;
};

export function PhoneCountryCodeSelect({ value, onChange, className, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => findCountryByDialCode(value) ?? findCountryByDialCode(DEFAULT_DIAL_CODE),
    [value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between gap-1 px-2 font-normal shrink-0", className ?? "w-[7.5rem]")}
        >
          <span className="truncate text-sm">
            {selected ? `${selected.flag} ${selected.code}` : "Code"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country or code…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {ALL_COUNTRY_DIAL_CODES.map(c => (
                <CommandItem
                  key={`${c.iso}-${c.code}`}
                  value={`${c.country} ${c.code} ${c.iso}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c.code ? "opacity-100" : "opacity-0")} />
                  <span className="mr-2">{c.flag}</span>
                  <span className="flex-1 truncate">{c.country}</span>
                  <span className="text-muted-foreground text-xs ml-2">{c.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
