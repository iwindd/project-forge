"use client";

import {
  ActionIcon,
  Box,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconMaximize,
  IconMinimize,
  IconRotate,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAppSelector } from "../hooks";
import { resetSettings } from "../features/layout/layout-slice";
import { useAppDispatch } from "../hooks";
import CorePreferences from "./settings-drawer/core-preferences";
import FontGroup from "./settings-drawer/font-group";
import { useScrollbarVisibility } from "./settings-drawer/use-scrollbar-visibility";
import classes from "./admin-settings-drawer.module.css";

export function AdminSettingsDrawer({
  opened,
  onCloseAction,
}: {
  opened: boolean;
  onCloseAction: () => void;
}) {
  const t = useTranslations("Settings");
  const [fullscreen, setFullscreen] = useState(false);
  const dispatch = useAppDispatch();
  const { fontScale } = useAppSelector((state) => state.layout);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const scrollbar = useScrollbarVisibility();
  const scrollbarClassName = `${classes.settingsScrollbar} ${
    scrollbar.visible ? classes.settingsScrollbarVisible : ""
  }`;
  const hasAnyChanges = colorScheme !== "auto" || fontScale !== 1;

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
      return;
    }

    void document.exitFullscreen().catch(() => undefined);
  };

  const resetAll = () => {
    dispatch(resetSettings());
    setColorScheme("auto");
  };

  return (
    <Drawer
      opened={opened}
      onClose={onCloseAction}
      position="right"
      size={360}
      withCloseButton={false}
      padding={0}
      classNames={{
        content: classes.drawerContent,
        body: classes.drawerBody,
      }}
    >
      <Group className={classes.drawerHeader} justify="space-between" p="md">
        <Text
          fw={700}
          size="lg"
          c="var(--mantine-color-text)"
        >
          {t("title")}
        </Text>
        <Group gap={4}>
          <Tooltip
            label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
            position="bottom"
          >
            <ActionIcon
              onClick={toggleFullscreen}
              variant="subtle"
              radius="md"
              size="lg"
              aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
            >
              {fullscreen ? (
                <IconMinimize size={20} />
              ) : (
                <IconMaximize size={20} />
              )}
            </ActionIcon>
          </Tooltip>

          <Tooltip label={t("reset")} position="bottom">
            <Box pos="relative">
              <ActionIcon
                onClick={resetAll}
                variant="subtle"
                radius="md"
                size="lg"
                aria-label={t("reset")}
              >
                <IconRotate size={20} />
              </ActionIcon>
              {hasAnyChanges && <Box className={classes.changeIndicator} />}
            </Box>
          </Tooltip>

          <ActionIcon
            onClick={onCloseAction}
            variant="subtle"
            radius="md"
            size="lg"
            aria-label={t("close")}
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>
      </Group>

      <ScrollArea
        className={classes.drawerScrollArea}
        classNames={{
          scrollbar: scrollbarClassName,
          thumb: classes.settingsScrollbarThumb,
        }}
        onMouseEnter={scrollbar.showThenHide}
        onMouseLeave={scrollbar.hide}
        onScrollPositionChange={scrollbar.showThenHide}
        scrollbars="y"
        scrollbarSize={10}
        scrollHideDelay={500}
        type="always"
      >
        <Stack className={classes.drawerContentInner} px="md" gap="xl" pb="xl">
          <CorePreferences />
          <FontGroup />
        </Stack>
      </ScrollArea>
    </Drawer>
  );
}
