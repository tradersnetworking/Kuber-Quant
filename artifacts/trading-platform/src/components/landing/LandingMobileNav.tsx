import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export type LandingNavLink = {
  href: string;
  label: string;
  show?: boolean;
};

type Props = {
  links: LandingNavLink[];
  className?: string;
};

/** Mobile section navigation for the public landing page. */
export function LandingMobileNav({ links, className }: Props) {
  const [open, setOpen] = useState(false);
  const visible = links.filter(l => l.show !== false);

  const navigate = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 border-border/80"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close menu overlay"
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-2 z-[70] w-[min(16rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card/98 backdrop-blur-xl shadow-xl p-2 md:hidden"
            >
              <ul className="space-y-0.5 max-h-[min(70dvh,24rem)] overflow-y-auto">
                {visible.map(link => (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => navigate(link.href)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
