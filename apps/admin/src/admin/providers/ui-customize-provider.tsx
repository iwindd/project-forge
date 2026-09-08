"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { useAppSelector } from "../hooks";

const BASE_FONT_SIZES = {
  "--mantine-font-size-xs": 12,
  "--mantine-font-size-sm": 14,
  "--mantine-font-size-md": 16,
  "--mantine-font-size-lg": 18,
  "--mantine-font-size-xl": 20,
  "--mantine-h1-font-size": 40.8,
  "--mantine-h2-font-size": 31.2,
  "--mantine-h3-font-size": 26.4,
  "--mantine-h4-font-size": 21.6,
  "--mantine-h5-font-size": 19.2,
  "--mantine-h6-font-size": 16.8,
};

export function UiCustomizeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const fontScale = useAppSelector((state) => state.layout.fontScale);

  useLayoutEffect(() => {
    Object.entries(BASE_FONT_SIZES).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(
        variable,
        `${value * fontScale}px`,
      );
    });
  }, [fontScale]);

  return <>{children}</>;
}
