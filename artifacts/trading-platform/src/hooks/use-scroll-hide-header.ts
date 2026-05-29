import { useCallback, useRef, useState } from "react";

/** Hide secondary header rows on scroll down; reveal on scroll up (mobile / tablet). */
export function useScrollHideHeader(threshold = 4) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const ticking = useRef(false);

  const onMainScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      // Capture synchronously — React recycles the synthetic event before rAF runs.
      const scrollTop = e.currentTarget.scrollTop;

      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        if (scrollTop <= 8) {
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
