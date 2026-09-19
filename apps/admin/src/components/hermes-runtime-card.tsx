'use client';

import { Alert, Badge, Button, Card, Group, Loader, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { getBrowserApiErrorMessage } from '@/lib/api/api';
import {
  useConnectHermesRuntimeMutation,
  useGetHermesRuntimeStatusQuery,
} from '@/lib/features/hermes-runtime/hermes-runtime-api';
import type { HermesRuntimeStatus } from '@/lib/features/hermes-runtime/hermes-runtime-schemas';

const stateColor: Record<HermesRuntimeStatus['state'], string> = {
  ready: 'green',
  detecting: 'blue',
  starting: 'blue',
  connecting: 'blue',
  negotiating: 'blue',
  unconfigured: 'gray',
  missing: 'red',
  incompatible: 'red',
  unhealthy: 'orange',
  'port-conflict': 'orange',
};

export function HermesRuntimeCard() {
  const t = useTranslations('HermesRuntime');
  const { data, isLoading, isFetching, error, refetch } = useGetHermesRuntimeStatusQuery(undefined, {
    pollingInterval: 5_000,
  });
  const [connect, { isLoading: isConnecting, error: connectError }] = useConnectHermesRuntimeMutation();

  if (isLoading) {
    return (
      <Card withBorder radius='md' p='xl'>
        <Group gap='xs'>
          <Loader size='sm' />
          <Text>{t('loading')}</Text>
        </Group>
      </Card>
    );
  }

  if (!data) {
    const message = getBrowserApiErrorMessage(error ?? connectError, t('loadFailed'));
    return (
      <Alert color='red' title={t('title')}>
        <Stack gap='sm'>
          <Text size='sm'>{message}</Text>
          <Button variant='light' onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </Stack>
      </Alert>
    );
  }

  const isReady = data.state === 'ready';
  const stateLabel = t(`states.${data.state}`);

  return (
    <Card withBorder radius='md' p='xl'>
      <Stack gap='md'>
        <Group justify='space-between' align='flex-start'>
          <div>
            <Text size='lg' fw={600}>
              {t('title')}
            </Text>
            <Text size='sm' c='dimmed'>
              {t('description')}
            </Text>
          </div>
          <Badge color={stateColor[data.state]} variant='light'>
            {stateLabel}
          </Badge>
        </Group>

        <Text size='sm'>{data.message}</Text>
        {connectError ? (
          <Alert color='red' title={t('connectFailed')}>
            {getBrowserApiErrorMessage(connectError, t('loadFailed'))}
          </Alert>
        ) : null}
        <Text size='sm' c='dimmed'>
          {t('endpoint', { host: data.endpoint.host, port: data.endpoint.port })}
        </Text>
        {data.version ? (
          <Text size='sm' c='dimmed'>
            {t('version', { version: data.version })}
          </Text>
        ) : null}
        {data.capabilities.length ? (
          <Text size='sm' c='dimmed'>
            {t('capabilities', { count: data.capabilities.length })}
          </Text>
        ) : null}

        <Group justify='flex-end'>
          <Button
            variant={isReady ? 'subtle' : 'filled'}
            loading={isConnecting || isFetching}
            onClick={() => void connect().unwrap()}
          >
            {isReady ? t('refresh') : t('connect')}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
