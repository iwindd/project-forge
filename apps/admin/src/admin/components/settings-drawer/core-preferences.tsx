"use client";

import {
  ActionIcon,
  Center,
  Grid,
  Group,
  SegmentedControl,
  Stack,
  Text,
  useMantineColorScheme,
  type MantineColorScheme,
} from "@mantine/core";
import { IconBrush, IconRotate } from "@tabler/icons-react";
import classes from "./core-preferences.module.css";

export default function CorePreferences() {
  // Mantine's color scheme manager is the only store for this setting; it
  // persists to localStorage and syncs across tabs on its own.
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isThemeModified = colorScheme !== "auto";

  return (
    <Grid>
      <Grid.Col span={12}>
        <div className={classes.optionCard}>
          <Group justify="space-between" w="100%">
            <Group>
              <Center>
                <IconBrush size={24} />
              </Center>
              <Text fw={600} size="sm">
                ธีม
              </Text>
            </Group>
            {isThemeModified && (
              <ActionIcon
                type="button"
                variant="default-subtle"
                size="sm"
                aria-label="รีเซ็ตธีม"
                onClick={() => setColorScheme("auto")}
              >
                <IconRotate size={14} aria-hidden />
              </ActionIcon>
            )}
          </Group>
          <Stack gap={4} w="100%">
            <SegmentedControl
              value={colorScheme}
              onChange={(value) =>
                setColorScheme(value as MantineColorScheme)
              }
              data={[
                { value: "light", label: "สว่าง" },
                { value: "dark", label: "มืด" },
                { value: "auto", label: "ตามระบบ" },
              ]}
              styles={{ root: { width: "100%" } }}
            />
          </Stack>
        </div>
      </Grid.Col>
    </Grid>
  );
}
