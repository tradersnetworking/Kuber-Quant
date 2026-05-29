import { useCallback, useRef, useState } from "react";

/** Hide secondary header rows on scroll down; reveal on scroll up (mobile phones only). */
export function useScrollHideHeader(threshold = 4) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const ticking = useRef(false);

  const onMainScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const scrollTop = el.scrollTop;
      const distanceFromBottom = el.scrollHeight - scrollTop - el.clientHeight;

      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        // Avoid layout jumps when user reaches the page end (elastic scroll / reflow).
        if (distanceFromBottom < 96) {
          setHeaderHidden(false);
        } else if (scrollTop <= 8) {
          setHeaderHidden(false);
        } else if (scrollTop > lastScrollTop.current + threshold) {
          setHeaderHidden(true);
        } else if (scrollTop < lastScrollTop.current - threshold) {
          setHeaderHidden(false);
        }
        lastScrollTop.current = scrollTop;
        ticking.current = false;
      });
    },
    [threshold],
  );

  /** Reset when route changes so header is visible at top of new pages. */
  const resetHeaderScroll = useCallback(() => {
    lastScrollTop.current = 0;
    setHeaderHidden(false);
  }, []);

  return { headerHidden, onMainScroll, resetHeaderScroll };
}
