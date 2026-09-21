'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type HermesChatTitleContextValue = {
  optimisticTitles: Record<string, string>;
  setTitleAction: (sessionId: string, title: string) => void;
};

const HermesChatTitleContext = createContext<HermesChatTitleContextValue>({
  optimisticTitles: {},
  setTitleAction: () => undefined,
});

export function HermesChatTitleProvider({ children }: { children: ReactNode }) {
  const [optimisticTitles, setOptimisticTitles] = useState<Record<string, string>>({});
  const setTitleAction = useCallback((sessionId: string, title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;
    setOptimisticTitles((current) => (current[sessionId] === normalizedTitle ? current : { ...current, [sessionId]: normalizedTitle }));
  }, []);
  const value = useMemo(() => ({ optimisticTitles, setTitleAction }), [optimisticTitles, setTitleAction]);

  return <HermesChatTitleContext.Provider value={value}>{children}</HermesChatTitleContext.Provider>;
}

export function useHermesChatTitles() {
  return useContext(HermesChatTitleContext);
}
