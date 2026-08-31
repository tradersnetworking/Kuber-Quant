import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { useLocation } from "wouter";
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
  const [mounted, setMounted] = useState(false);
  const [, setLocation] = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelTop, setPanelTop] = useState(72);
  const visible = links.filter(l => l.show !== false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPanelTop(rect.bottom + 8);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, updatePanelPosition]);

  const navigate = (href: string) => {
    setOpen(false);
    if (href.startsWith("/")) {
      setLocation(href);
      return;
    }
    window.requestAnimationFrame(() => {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const menuPortal = mounted && open
    ? createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                type="button"
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-label="Close menu overlay"
                className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px] md:hidden"
                onClick={() => setOpen(false)}
              />
              <motion.nav
                key="menu"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                style={{ top: panelTop }}
                className="fixed left-3 right-3 z-[210] rounded-xl border border-border bg-card shadow-2xl p-2 md:hidden max-h-[min(70dvh,24rem)] overflow-y-auto"
                aria-label="Page sections"
              >
                {visible.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">No sections available</p>
                ) : (
                  <ul className="space-y-0.5">
                    {visible.map(link => (
                      <li key={link.href}>
                        <button
                          type="button"
                          onClick={() => navigate(link.href)}
                          className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.nav>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="icon"
        className={cn("h-9 w-9 shrink-0 border-border/80", className)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          if (!open) updatePanelPosition();
          setOpen(v => !v);
        }}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      {menuPortal}
    </>
  );
}
