'use client';

import { Alert, Badge, Button, Card, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getBrowserApiErrorMessage } from '@/lib/api/api';
import { useGetSharedAgentOptionsQuery, useGetSharedAgentsQuery } from '@/lib/features/hermes-agents/hermes-agents-api';
import type { SharedAgent } from '@/lib/features/hermes-agents/hermes-agents-schemas';
import { SharedAgentCreateForm } from './shared-agent-create-form';

const readinessColor: Record<SharedAgent['readiness'], string> = {
  ready: 'green',
  unavailable: 'orange',
  incompatible: 'red',
  'incomplete-configuration': 'yellow',
};

export function SharedAgentsRoster() {
  const t = useTranslations('SharedAgents');
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data, error, isFetching, isLoading, refetch } = useGetSharedAgentsQuery();
  const canConfigure = data?.permissions.canConfigure ?? false;
  const {
    data: options,
    error: optionsError,
    isFetching: isFetchingOptions,
    isLoading: isLoadingOptions,
    refetch: refetchOptions,
  } = useGetSharedAgentOptionsQuery(undefined, { skip: !canConfigure || !showCreateForm });

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
    return (
      <Alert color='red' title={t('title')}>
        <Stack gap='sm'>
          <Text size='sm'>{getBrowserApiErrorMessage(error, t('loadFailed'))}</Text>
          <Button variant='light' onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </Stack>
      </Alert>
    );
  }

  const selectedAgent = data.agents.find((agent) => agent.handle === selectedHandle) ?? null;
  const isRuntimeReady = data.runtime.state === 'ready';

  return (
    <Stack gap='md'>
      <Group justify='flex-end'>
        {canConfigure ? (
          <Button
            variant={showCreateForm ? 'default' : 'light'}
            onClick={() => setShowCreateForm((visible) => !visible)}
          >
            {showCreateForm ? t('cancelCreate') : t('create')}
          </Button>
        ) : null}
        <Button variant='light' loading={isFetching} onClick={() => void refetch()}>
          {t('refresh')}
        </Button>
      </Group>

      {showCreateForm ? (
        isLoadingOptions || isFetchingOptions ? (
          <Card withBorder radius='md' p='xl'>
            <Group gap='xs'>
              <Loader size='sm' />
              <Text>{t('loadingOptions')}</Text>
            </Group>
          </Card>
        ) : options ? (
          <SharedAgentCreateForm
            options={options}
            onCancelAction={() => setShowCreateForm(false)}
            onCreatedAction={(result) => {
              void refetch();
              if (result.status === 'ready') {
                setShowCreateForm(false);
              }
            }}
          />
        ) : (
          <Alert color='red' title={t('optionsLoadFailed')}>
            <Stack gap='sm'>
              <Text size='sm'>{getBrowserApiErrorMessage(optionsError, t('optionsLoadFailed'))}</Text>
              <Button variant='light' onClick={() => void refetchOptions()}>
                {t('retry')}
              </Button>
            </Stack>
          </Alert>
        )
      ) : null}

      {!isRuntimeReady ? (
        <Alert color='orange' title={t('runtimeTitle')}>
          <Stack gap='xs'>
            <Text size='sm'>{t(`runtimeStates.${data.runtime.state}`)}</Text>
            <Text size='sm' c='dimmed'>
              {data.runtime.message}
            </Text>
          </Stack>
        </Alert>
      ) : null}

      <Alert color={data.permissions.canConfigure ? 'blue' : 'gray'} title={t('permissionTitle')}>
        {data.permissions.canConfigure ? t('platformAdminNotice') : t('userNotice')}
      </Alert>

      {data.agents.length === 0 ? (
        <Card withBorder radius='md' p='xl'>
          <Text c='dimmed'>{t('empty')}</Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='md'>
          {data.agents.map((agent) => (
            <AgentCard
              key={agent.handle}
              agent={agent}
              selected={agent.handle === selectedHandle}
              onSelectAction={() => setSelectedHandle(agent.handle)}
              onRetryAction={() => void refetch()}
              translate={t}
            />
          ))}
        </SimpleGrid>
      )}

      {selectedAgent ? (
        <Alert color='blue' title={t('selectedTitle')}>
          {t('selectedDescription', { name: selectedAgent.displayName })}
        </Alert>
      ) : null}
    </Stack>
  );
}

function AgentCard({
  agent,
  selected,
  onSelectAction,
  onRetryAction,
  translate,
}: {
  agent: SharedAgent;
  selected: boolean;
  onSelectAction: () => void;
  onRetryAction: () => void;
  translate: ReturnType<typeof useTranslations<'SharedAgents'>>;
}) {
  const isReady = agent.readiness === 'ready';
  const canRetry = agent.action === 'retry';
  const actionHandler = isReady ? onSelectAction : canRetry ? onRetryAction : undefined;
  const model = agent.model && agent.provider ? `${agent.provider} / ${agent.model}` : translate('notConfigured');

  return (
    <Card
      withBorder
      radius='md'
      p='lg'
      data-agent-handle={agent.handle}
      data-readiness={agent.readiness}
      data-has-avatar={agent.hasAvatar ? 'true' : 'false'}
    >
      <Stack gap='sm'>
        <Group justify='space-between' align='flex-start'>
          <div>
            <Text fw={600}>{agent.displayName}</Text>
            <Text size='xs' c='dimmed'>
              {agent.handle}
            </Text>
          </div>
          <Badge color={readinessColor[agent.readiness]} variant='light'>
            {translate(`readiness.${agent.readiness}`)}
          </Badge>
        </Group>

        {agent.description ? <Text size='sm'>{agent.description}</Text> : null}
        <Text size='sm' c='dimmed'>
          {translate('model', { model })}
        </Text>
        <Text size='sm' c='dimmed'>
          {translate('skills', { count: agent.skillCount })}
        </Text>
        <Text size='sm' c='dimmed'>
          {translate(`agentMessages.${agent.readiness}`)}
        </Text>

        <Button disabled={!actionHandler} variant={selected ? 'filled' : 'light'} onClick={actionHandler}>
          {selected
            ? translate('selected')
            : isReady
              ? translate('use')
              : canRetry
                ? translate('retry')
                : translate('notReady')}
        </Button>
      </Stack>
    </Card>
  );
}
