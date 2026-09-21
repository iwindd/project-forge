'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type HermesChatTitleContextValue = {
  optimisticTitles: Record<string, string>;
  optimisticAgentNames: Record<string, string>;
  setTitleAction: (sessionId: string, title: string, agentName?: string) => void;
};

const HermesChatTitleContext = createContext<HermesChatTitleContextValue>({
  optimisticTitles: {},
  optimisticAgentNames: {},
  setTitleAction: () => undefined,
});

export function HermesChatTitleProvider({ children }: { children: ReactNode }) {
  const [optimisticTitles, setOptimisticTitles] = useState<Record<string, string>>({});
  const [optimisticAgentNames, setOptimisticAgentNames] = useState<Record<string, string>>({});
  const setTitleAction = useCallback((sessionId: string, title: string, agentName?: string) => {
    const normalizedTitle = title.trim();
    const normalizedAgentName = agentName?.trim();
    if (normalizedTitle) {
      setOptimisticTitles((current) =>
        current[sessionId] === normalizedTitle ? current : { ...current, [sessionId]: normalizedTitle },
      );
    }
    if (normalizedAgentName) {
      setOptimisticAgentNames((current) =>
        current[sessionId] === normalizedAgentName ? current : { ...current, [sessionId]: normalizedAgentName },
      );
    }
  }, []);
  const value = useMemo(
    () => ({ optimisticTitles, optimisticAgentNames, setTitleAction }),
    [optimisticAgentNames, optimisticTitles, setTitleAction],
  );

  return <HermesChatTitleContext.Provider value={value}>{children}</HermesChatTitleContext.Provider>;
}

export function useHermesChatTitles() {
  return useContext(HermesChatTitleContext);
}
