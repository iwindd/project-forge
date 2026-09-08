"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HIDE_DELAY = 1000;

export function useScrollbarVisibility() {
  const [visible, setVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (!hideTimeoutRef.current) {
      return;
    }

    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  }, []);

  const hide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      hideTimeoutRef.current = null;
    }, HIDE_DELAY);
  }, [clearHideTimeout]);

  const show = useCallback(() => {
    clearHideTimeout();
    setVisible(true);
  }, [clearHideTimeout]);

  const showThenHide = useCallback(() => {
    show();
    hide();
  }, [hide, show]);

  useEffect(() => clearHideTimeout, [clearHideTimeout]);

  return { visible, hide, showThenHide };
}
