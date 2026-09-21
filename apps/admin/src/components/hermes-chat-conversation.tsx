'use client';

import { ActionIcon, Avatar, Center, Divider, Group, Paper, ScrollArea, Select, Stack, Text, Textarea } from '@mantine/core';
import { IconChevronDown, IconRobot, IconSend2, IconSparkles, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import type { SharedAgent } from '@/lib/features/hermes-agents/hermes-agents-schemas';
import type { HermesSessionSummary } from '@/lib/features/hermes-sessions/hermes-sessions-schemas';
import type { LocalMessage } from './hermes-chat-types';
import styles from './hermes-chat-workspace.module.css';

type HermesChatConversationProps = {
  currentAgent: SharedAgent | null;
  selectedSession: HermesSessionSummary | null;
  readyAgents: SharedAgent[];
  messages: LocalMessage[];
  draft: string;
  canCompose: boolean;
  pendingMessage: boolean;
  friendlyError: string | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  selectAgentAction: (value: string | null) => void;
  draftChangeAction: (value: string) => void;
  submitAction: () => void;
  dismissErrorAction: () => void;
};

export function HermesChatConversation({
  currentAgent,
  selectedSession,
  readyAgents,
  messages,
  draft,
  canCompose,
  pendingMessage,
  friendlyError,
  composerRef,
  selectAgentAction,
  draftChangeAction,
  submitAction,
  dismissErrorAction,
}: HermesChatConversationProps) {
  const t = useTranslations('Chat');

  return (
    <main className={styles.conversation}>
      <Group className={styles.conversationHeader} justify='space-between' wrap='nowrap'>
        <Group gap='sm' wrap='nowrap'>
          <Avatar color='indigo' radius='xl' size='sm'>
            {currentAgent ? <IconRobot size={16} /> : <IconSparkles size={16} />}
          </Avatar>
          <Select
            aria-label={t('agent')}
            variant='unstyled'
            size='sm'
            value={currentAgent?.handle ?? null}
            placeholder={t('chooseAgent')}
            data={readyAgents.map((agent) => ({ value: agent.handle, label: agent.displayName }))}
            onChange={selectAgentAction}
            rightSection={<IconChevronDown size={15} />}
            checkIconPosition='right'
            allowDeselect={false}
            className={styles.agentSelect}
          />
        </Group>
        {selectedSession?.active ? <span className={styles.liveDot} aria-hidden='true' /> : null}
      </Group>
      <Divider />

      <ScrollArea className={styles.messages} type='auto' offsetScrollbars>
        {messages.length ? (
          <Stack gap='lg' className={styles.messageStack}>
            {messages.map((message) => (
              <div key={message.localId} className={message.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow}>
                <Paper className={message.role === 'user' ? styles.userMessage : styles.assistantMessage} radius='lg' p='sm'>
                  <Text size='sm' className={styles.messageText}>
                    {message.text}
                    {message.streaming ? <span className={styles.cursor} aria-hidden='true' /> : null}
                  </Text>
                </Paper>
              </div>
            ))}
          </Stack>
        ) : (
          <Center className={styles.emptyConversation}>
            <Stack align='center' gap={4}>
              <IconSparkles size={26} stroke={1.4} />
              <Text size='sm' c='dimmed'>
                {currentAgent ? t('empty', { agent: currentAgent.displayName }) : t('noAgent')}
              </Text>
            </Stack>
          </Center>
        )}
      </ScrollArea>

      <Stack gap='xs' className={styles.composerWrap}>
        {friendlyError ? (
          <Group justify='space-between' gap='xs' className={styles.inlineError} wrap='nowrap'>
            <Text size='xs' c='red'>
              {friendlyError}
            </Text>
            <ActionIcon aria-label={t('dismiss')} size='xs' variant='subtle' onClick={dismissErrorAction}>
              <IconX size={14} />
            </ActionIcon>
          </Group>
        ) : null}
        <Paper withBorder radius='lg' className={styles.composer}>
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => draftChangeAction(event.currentTarget.value)}
            placeholder={currentAgent ? t('composerPlaceholder') : t('noAgent')}
            autosize
            minRows={1}
            maxRows={6}
            variant='unstyled'
            disabled={!canCompose}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitAction();
              }
            }}
            aria-label={t('composer')}
          />
          <Group justify='flex-end'>
            <ActionIcon
              aria-label={t('send')}
              color='indigo'
              variant='filled'
              radius='xl'
              onClick={submitAction}
              disabled={!draft.trim() || !canCompose || pendingMessage}
            >
              <IconSend2 size={16} />
            </ActionIcon>
          </Group>
        </Paper>
      </Stack>
    </main>
  );
}
