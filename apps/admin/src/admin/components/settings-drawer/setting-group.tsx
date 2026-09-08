import { Center, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconRotate } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./setting-group.module.css";

export default function SettingGroup({
  title,
  isDirty = false,
  onReset,
  children,
}: {
  title: string;
  isDirty?: boolean;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <Stack gap="xs">
      <UnstyledButton
        type="button"
        disabled={!isDirty}
        onClick={onReset}
        aria-label={`รีเซ็ต ${title}`}
        className={`${classes.button} ${isDirty ? classes.dirty : ""}`}
      >
        <Center>{isDirty && <IconRotate size={14} aria-hidden />}</Center>
        <Text fw={600} size="xs" className={classes.title}>
          {title}
        </Text>
      </UnstyledButton>
      {children}
    </Stack>
  );
}
