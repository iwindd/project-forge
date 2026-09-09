"use client";

import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import classes from "./navigation-scroll-controls.module.css";

const SCROLL_TOLERANCE = 2;
const FALLBACK_STEP = 64;

type NavigationScrollControlsProps = {
  children: ReactNode;
  orientation: "vertical";
  viewportRef: RefObject<HTMLDivElement | null>;
};

type ScrollState = {
  hasOverflow: boolean;
  atStart: boolean;
  atEnd: boolean;
};

export default function NavigationScrollControls({
  children,
  orientation,
  viewportRef,
}: NavigationScrollControlsProps) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    hasOverflow: false,
    atStart: true,
    atEnd: true,
  });

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const scrollPosition = viewport.scrollTop;
    const viewportSize = viewport.clientHeight;
    const scrollSize = viewport.scrollHeight;
    const maxScroll = Math.max(scrollSize - viewportSize, 0);

    setScrollState({
      hasOverflow: maxScroll > SCROLL_TOLERANCE,
      atStart: scrollPosition <= SCROLL_TOLERANCE,
      atEnd: scrollPosition >= maxScroll - SCROLL_TOLERANCE,
    });
  }, [viewportRef]);

  const getMenuScrollTarget = useCallback(
    (direction: "backward" | "forward") => {
      const viewport = viewportRef.current;

      if (!viewport) return 0;

      const viewportRect = viewport.getBoundingClientRect();
      const currentPosition = viewport.scrollTop;
      const viewportSize = viewport.clientHeight;
      const scrollSize = viewport.scrollHeight;
      const maxScroll = Math.max(scrollSize - viewportSize, 0);
      const candidates = Array.from(
        viewport.querySelectorAll<HTMLElement>("a, button"),
      )
        .filter((element) => {
          const rect = element.getBoundingClientRect();

          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();

          return rect.top - viewportRect.top + viewport.scrollTop;
        })
        .sort((a, b) => a - b);

      if (direction === "forward") {
        return (
          candidates.find(
            (position) => position > currentPosition + SCROLL_TOLERANCE,
          ) ?? Math.min(currentPosition + FALLBACK_STEP, maxScroll)
        );
      }

      for (let index = candidates.length - 1; index >= 0; index -= 1) {
        const candidate = candidates[index];
        if (
          candidate !== undefined &&
          candidate < currentPosition - SCROLL_TOLERANCE
        ) {
          return candidate;
        }
      }

      return Math.max(currentPosition - FALLBACK_STEP, 0);
    },
    [viewportRef],
  );

  const scrollToMenu = useCallback(
    (direction: "backward" | "forward") => {
      const viewport = viewportRef.current;

      if (!viewport) return;

      const target = getMenuScrollTarget(direction);

      viewport.scrollTo({
        left: viewport.scrollLeft,
        top: target,
        behavior: "smooth",
      });
    },
    [getMenuScrollTarget, viewportRef],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const content = viewport.firstElementChild;
    const resizeObserver = new ResizeObserver(updateScrollState);

    updateScrollState();
    viewport.addEventListener("scroll", updateScrollState, { passive: true });
    resizeObserver.observe(viewport);

    if (content) {
      resizeObserver.observe(content);
    }

    return () => {
      viewport.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, viewportRef]);

  const hideStart = !scrollState.hasOverflow || scrollState.atStart;
  const hideEnd = !scrollState.hasOverflow || scrollState.atEnd;

  return (
    <div className={classes.scrollControlsRoot} data-orientation={orientation}>
      {children}
      <button
        type="button"
        aria-label="Scroll menu up"
        className={`${classes.control} ${classes.controlStart}`}
        data-hidden={hideStart}
        data-orientation={orientation}
        disabled={hideStart}
        onClick={() => scrollToMenu("backward")}
      >
        <IconChevronUp size={18} stroke={2.4} />
      </button>
      <button
        type="button"
        aria-label="Scroll menu down"
        className={`${classes.control} ${classes.controlEnd}`}
        data-hidden={hideEnd}
        data-orientation={orientation}
        disabled={hideEnd}
        onClick={() => scrollToMenu("forward")}
      >
        <IconChevronDown size={18} stroke={2.4} />
      </button>
    </div>
  );
}
