'use client';

import { Group, Text } from '@mantine/core';

export function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Group gap='sm' wrap='nowrap' ps='sm'>
      {!compact && (
        <div>
          <Text fw={600} size='xl' style={{ fontFamily: 'var(--font-prompt), sans-serif' }}>
            PROJECT FORGE
          </Text>
          <Text size='xs' c='dimmed' lh={1.2}>
            Project workspace
          </Text>
        </div>
      )}
    </Group>
  );
}
