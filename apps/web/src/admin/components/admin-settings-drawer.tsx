'use client';

import { ActionIcon, Drawer, Group, SegmentedControl, Stack, Text, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconRefresh, IconSun, IconX } from '@tabler/icons-react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { resetSettings, setNavColor } from '../features/layout/layout-slice';

export function AdminSettingsDrawer({ opened, onCloseAction }: { opened: boolean; onCloseAction: () => void }) {
  const dispatch = useAppDispatch();
  const navColor = useAppSelector((state) => state.layout.navColor);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <Drawer
      opened={opened}
      onClose={onCloseAction}
      position='right'
      size={360}
      title={
        <Group justify='space-between' w='100%'>
          <Text fw={700}>การตั้งค่า</Text>
          <ActionIcon variant='subtle' aria-label='ปิดการตั้งค่า' onClick={onCloseAction}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
      }
    >
      <Stack gap='xl'>
        <Stack gap='xs'>
          <Text size='sm' fw={600}>
            โหมดสี
          </Text>
          <SegmentedControl
            value={colorScheme}
            onChange={(value) => setColorScheme(value as 'auto' | 'light' | 'dark')}
            data={[
              { label: <IconSun size={16} />, value: 'light' },
              { label: 'Auto', value: 'auto' },
              { label: <IconMoon size={16} />, value: 'dark' },
            ]}
          />
        </Stack>
        <Stack gap='xs'>
          <Text size='sm' fw={600}>
            สีเมนูด้านข้าง
          </Text>
          <SegmentedControl
            value={navColor}
            onChange={(value) => dispatch(setNavColor(value as 'integrate' | 'apparent'))}
            data={[
              { label: 'App', value: 'integrate' },
              { label: 'Contrast', value: 'apparent' },
            ]}
          />
        </Stack>
        <ActionIcon
          variant='default'
          size='lg'
          aria-label='รีเซ็ตการตั้งค่า'
          onClick={() => {
            dispatch(resetSettings());
            setColorScheme('auto');
          }}
        >
          <IconRefresh size={18} />
        </ActionIcon>
      </Stack>
    </Drawer>
  );
}
