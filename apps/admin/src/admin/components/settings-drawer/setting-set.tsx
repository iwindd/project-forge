import { ActionIcon, Box, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle, IconRotate } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import classes from "./setting-set.module.css";

type SettingSetStyle = CSSProperties & { "--setting-set-offset": string };

export default function SettingSet({
  title,
  information,
  isDirty = false,
  onReset,
  children,
  offset = 16,
}: {
  title: string;
  information?: string;
  isDirty?: boolean;
  onReset?: () => void;
  children: ReactNode;
  offset?: number;
}) {
  return (
    <Box
      className={classes.root}
      style={{ "--setting-set-offset": `${offset}px` } as SettingSetStyle}
      p="lg"
      pt="xl"
    >
      <Group className={classes.header} px={8} py={4} gap={4}>
        {isDirty && (
          <ActionIcon
            type="button"
            variant="transparent"
            size={14}
            onClick={onReset}
            aria-label={`รีเซ็ต ${title}`}
            className={classes.reset}
          >
            <IconRotate width="100%" aria-hidden />
          </ActionIcon>
        )}
        <Text size="xs" fw={600} className={classes.title}>
          {title}
        </Text>
        {information && (
          <Tooltip label={information} withArrow>
            <Box
              component="span"
              tabIndex={0}
              role="img"
              aria-label={information}
              className={classes.info}
            >
              <IconInfoCircle size={14} aria-hidden />
            </Box>
          </Tooltip>
        )}
      </Group>
      <Box>{children}</Box>
    </Box>
  );
}
