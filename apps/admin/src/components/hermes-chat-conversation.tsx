'use client';

import {
  ActionIcon,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconChevronDown, IconSend2, IconSparkles, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import type { SharedAgent } from '@/lib/features/hermes-agents/hermes-agents-schemas';
import type { LocalMessage } from './hermes-chat-types';
import styles from './hermes-chat-workspace.module.css';

type ConversationMode = 'new' | 'loading' | 'not-found' | 'active';

type HermesChatConversationProps = {
  mode: ConversationMode;
  currentAgent: SharedAgent | null;
  readyAgents: SharedAgent[];
  messages: LocalMessage[];
  draft: string;
  canCompose: boolean;
  pendingMessage: boolean;
  friendlyError: string | null;
  retryAvailable: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  selectAgentAction: (value: string | null) => void;
  draftChangeAction: (value: string) => void;
  submitAction: () => void;
  retryAction: () => void;
  dismissErrorAction: () => void;
};

export function HermesChatConversation({
  mode,
  currentAgent,
  readyAgents,
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
}: HermesChatConversationProps) {
  const t = useTranslations('Chat');

  if (mode === 'loading') {
    return (
      <main className={styles.conversation}>
        <Center className={styles.emptyState}>
          <Loader size='sm' />
        </Center>
      </main>
    );
  }

  if (mode === 'not-found') {
    return (
      <main className={styles.conversation}>
        <Center className={styles.emptyState}>
          <Stack align='center' gap='xs'>
            <IconSparkles size={28} stroke={1.4} />
            <Text c='dimmed'>{t('sessionNotFound')}</Text>
          </Stack>
        </Center>
      </main>
    );
  }

  if (mode === 'new') {
    return (
      <main className={`${styles.conversation} ${styles.newConversation}`}>
        <Stack className={styles.newChatContent} align='center' gap='xl'>
          <Stack align='center' gap='sm'>
            <IconSparkles size={34} stroke={1.35} />
            <Title order={2} className={styles.newChatGreeting}>
              {t('newGreeting')}
            </Title>
          </Stack>
          <Select
            aria-label={t('agent')}
            value={currentAgent?.handle ?? null}
            placeholder={t('chooseAgent')}
            data={readyAgents.map((agent) => ({ value: agent.handle, label: agent.displayName }))}
            onChange={selectAgentAction}
            rightSection={<IconChevronDown size={15} />}
            checkIconPosition='right'
            allowDeselect={false}
            className={styles.newAgentSelect}
          />
          <ChatComposer
            containerClassName={styles.newComposerWrap}
            composerRef={composerRef}
            draft={draft}
            canCompose={canCompose}
            pendingMessage={pendingMessage}
            friendlyError={friendlyError}
            retryAvailable={retryAvailable}
            draftChangeAction={draftChangeAction}
            submitAction={submitAction}
            retryAction={retryAction}
            dismissErrorAction={dismissErrorAction}
            placeholder={t('composerPlaceholder')}
          />
        </Stack>
      </main>
    );
  }

  return (
    <main className={styles.conversation}>
      <ScrollArea className={styles.messages} type='auto' offsetScrollbars>
        {messages.length ? (
          <Stack gap='lg' className={styles.messageStack}>
            {messages.map((message) => (
              <div
                key={message.localId}
                className={message.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow}
              >
                <Paper
                  className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
                  radius='lg'
                  p='sm'
                >
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
                {t('empty')}
              </Text>
            </Stack>
          </Center>
        )}
      </ScrollArea>

      <ChatComposer
        containerClassName={styles.composerWrap}
        composerRef={composerRef}
        draft={draft}
        canCompose={canCompose}
        pendingMessage={pendingMessage}
        friendlyError={friendlyError}
        retryAvailable={retryAvailable}
        draftChangeAction={draftChangeAction}
        submitAction={submitAction}
        retryAction={retryAction}
        dismissErrorAction={dismissErrorAction}
        placeholder={t('composerPlaceholder')}
      />
    </main>
  );
}

type ChatComposerProps = {
  containerClassName: string;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  canCompose: boolean;
  pendingMessage: boolean;
  friendlyError: string | null;
  retryAvailable: boolean;
  draftChangeAction: (value: string) => void;
  submitAction: () => void;
  retryAction: () => void;
  dismissErrorAction: () => void;
  placeholder: string;
};

function ChatComposer({
  containerClassName,
  composerRef,
  draft,
  canCompose,
  pendingMessage,
  friendlyError,
  retryAvailable,
  draftChangeAction,
  submitAction,
  retryAction,
  dismissErrorAction,
  placeholder,
}: ChatComposerProps) {
  const t = useTranslations('Chat');

  return (
    <Stack gap='xs' className={containerClassName}>
      {friendlyError ? (
        <Group justify='space-between' gap='xs' className={styles.inlineError} wrap='nowrap'>
          <Text size='xs' c='red'>
            {friendlyError}
          </Text>
          <Group gap={2} wrap='nowrap'>
            {retryAvailable ? (
              <Button size='compact-xs' variant='subtle' color='red' onClick={retryAction}>
                {t('retry')}
              </Button>
            ) : null}
            <ActionIcon aria-label={t('dismiss')} size='xs' variant='subtle' onClick={dismissErrorAction}>
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>
      ) : null}
      <Paper withBorder radius='lg' className={styles.composer}>
        <Textarea
          ref={composerRef}
          value={draft}
          onChange={(event) => draftChangeAction(event.currentTarget.value)}
          placeholder={placeholder}
          autosize
          minRows={1}
          maxRows={6}
          variant='unstyled'
          disabled={!canCompose || pendingMessage}
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
  );
}
