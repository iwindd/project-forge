'use client';

import { ActionIcon, Center, Loader, Stack, Text } from '@mantine/core';
import { IconMessageCircle2, IconRefresh, IconSparkles } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { getBrowserApiErrorMessage } from '@/lib/api/api';
import { useHermesChatWorkspace } from '@/lib/features/hermes-sessions/use-hermes-chat-workspace';
import { HermesChatConversation } from './hermes-chat-conversation';
import styles from './hermes-chat-workspace.module.css';

export { canComposeChat, snapshotContainsAssistantReply } from '@/lib/features/hermes-sessions/hermes-chat-workspace-utils';

export function HermesChatWorkspace() {
  const t = useTranslations('Chat');
  const {
    agentRoster,
    agentError,
    sessionsError,
    refetchAgents,
    readyAgents,
    currentAgent,
    selectedSession,
    conversationMode,
    messages,
    draft,
    canCompose,
    pendingMessage,
    friendlyError,
    retryAvailable,
    composerRef,
    selectAgentAction,
    draftChangeAction,
    submitAction,
    retryAction,
    dismissErrorAction,
    hasInitialData,
  } = useHermesChatWorkspace();

  const error = agentError || sessionsError;
  if (!hasInitialData) {
    return (
      <Center className={styles.loading}>
        <Loader size='sm' />
      </Center>
    );
  }

  if (error && !agentRoster) {
    return (
      <Center className={styles.emptyState}>
        <Stack align='center' gap='sm'>
          <IconMessageCircle2 size={28} stroke={1.5} />
          <Text>{getBrowserApiErrorMessage(error, t('loadFailed'))}</Text>
          <ActionIcon aria-label={t('retry')} variant='subtle' onClick={() => void refetchAgents()}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Stack>
      </Center>
    );
  }

  if (agentRoster?.runtime.state !== 'ready' || readyAgents.length === 0) {
    return (
      <Center className={styles.emptyState}>
        <Stack align='center' gap='sm'>
          <IconSparkles size={30} stroke={1.4} />
          <Text>{agentRoster?.runtime.state === 'ready' ? t('noAgent') : t('runtimeNotReady')}</Text>
          <ActionIcon aria-label={t('retry')} variant='subtle' onClick={() => void refetchAgents()}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Stack>
      </Center>
    );
  }

  return (
    <div className={styles.workspace}>
      <HermesChatConversation
        mode={conversationMode}
        currentAgent={currentAgent}
        selectedSession={selectedSession}
        readyAgents={readyAgents}
        messages={messages}
        draft={draft}
        canCompose={canCompose}
        pendingMessage={pendingMessage}
        friendlyError={friendlyError}
        retryAvailable={retryAvailable}
        composerRef={composerRef}
        selectAgentAction={selectAgentAction}
        draftChangeAction={draftChangeAction}
        submitAction={submitAction}
        retryAction={retryAction}
        dismissErrorAction={dismissErrorAction}
      />
    </div>
  );
}
