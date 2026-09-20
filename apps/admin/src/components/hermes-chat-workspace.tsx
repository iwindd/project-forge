'use client';

import {
  ActionIcon,
  Avatar,
  Center,
  Divider,
  Group,
  Loader,
  Menu,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconArchive,
  IconChevronDown,
  IconDots,
  IconMessageCircle2,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconSend2,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBrowserApiErrorMessage } from '@/lib/api/api';
import { useGetSharedAgentsQuery } from '@/lib/features/hermes-agents/hermes-agents-api';
import type { SharedAgent } from '@/lib/features/hermes-agents/hermes-agents-schemas';
import {
  useCloseHermesSessionMutation,
  useCreateHermesSessionMutation,
  useGetHermesSessionsQuery,
  useRenameHermesSessionMutation,
} from '@/lib/features/hermes-sessions/hermes-sessions-api';
import type {
  HermesChatMessage,
  HermesSessionSnapshot,
  HermesSessionSummary,
} from '@/lib/features/hermes-sessions/hermes-sessions-schemas';
import {
  useHermesChat,
  type HermesChatConnectionState,
  type HermesChatFrame,
} from '@/lib/features/hermes-sessions/use-hermes-chat';
import styles from './hermes-chat-workspace.module.css';

type LocalMessage = HermesChatMessage & { localId: string; streaming?: boolean };

export function canComposeChat(currentAgent: SharedAgent | null, connectionState: HermesChatConnectionState): boolean {
  const transportAllowsDraft =
    connectionState === 'connecting' || connectionState === 'connected' || connectionState === 'offline';
  return Boolean(currentAgent) && transportAllowsDraft;
}

type PendingMessage = { sessionId: string; text: string; clientMessageId: string };

export function HermesChatWorkspace() {
  const t = useTranslations('Chat');
  const {
    data: agentRoster,
    error: agentError,
    isLoading: agentsLoading,
    refetch: refetchAgents,
  } = useGetSharedAgentsQuery();
  const {
    data: sessions = [],
    error: sessionsError,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useGetHermesSessionsQuery();
  const [createSession, createState] = useCreateHermesSessionMutation();
  const [renameSession] = useRenameHermesSessionMutation();
  const [closeSession] = useCloseHermesSessionMutation();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedAgentHandle, setSelectedAgentHandle] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [attachedSessionId, setAttachedSessionId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const attachRequestedSessionRef = useRef<string | null>(null);
  const pendingMessageRef = useRef<PendingMessage | null>(null);
  const sentMessageRef = useRef<string | null>(null);

  const onFrame = useCallback((frame: HermesChatFrame) => {
    if (frame.type === 'ready') {
      setAttachedSessionId(null);
      attachRequestedSessionRef.current = null;
      return;
    }
    if (frame.type === 'snapshot') {
      const hydrated = hydrateSnapshotMessages(frame.session);
      const queuedMessage = pendingMessageRef.current;
      setMessages((current) => {
        const optimisticUser = current.find(
          (message) =>
            message.role === 'user' &&
            message.localId === queuedMessage?.clientMessageId &&
            queuedMessage.sessionId === frame.session.sessionId,
        );
        if (!optimisticUser || hydrated.some((message) => message.role === 'user' && message.text === optimisticUser.text)) {
          return hydrated;
        }
        return [...hydrated, optimisticUser];
      });
      if (queuedMessage?.sessionId === frame.session.sessionId && snapshotContainsAssistantReply(frame.session, queuedMessage.text)) {
        setPendingMessage(null);
        pendingMessageRef.current = null;
        sentMessageRef.current = null;
      }
      setAttachedSessionId(frame.session.sessionId);
      return;
    }
    if (frame.type === 'assistant.start') {
      setMessages((current) => [
        ...current,
        {
          localId: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '',
          timestamp: new Date().toISOString(),
          rowId: null,
          streaming: true,
        },
      ]);
      return;
    }
    if (frame.type === 'assistant.delta') {
      setMessages((current) => {
        const last = current.at(-1);
        if (!last || last.role !== 'assistant' || !last.streaming) {
          return [
            ...current,
            {
              localId: `assistant-${Date.now()}`,
              role: 'assistant',
              text: frame.text,
              timestamp: new Date().toISOString(),
              rowId: null,
              streaming: true,
            },
          ];
        }
        return [...current.slice(0, -1), { ...last, text: last.text + frame.text }];
      });
      return;
    }
    if (frame.type === 'assistant.complete') {
      setMessages((current) => {
        const last = current.at(-1);
        if (last?.role === 'assistant' && last.streaming) {
          return [...current.slice(0, -1), { ...last, text: frame.text || last.text, streaming: false }];
        }
        return [
          ...current,
          {
            localId: `assistant-${Date.now()}`,
            role: 'assistant',
            text: frame.text,
            timestamp: new Date().toISOString(),
            rowId: null,
          },
        ];
      });
      setPendingMessage(null);
      pendingMessageRef.current = null;
      sentMessageRef.current = null;
      return;
    }
    if (frame.type === 'session.updated') {
      void refetchSessions();
      return;
    }
    if (frame.type === 'error') {
      if (frame.code === 'MESSAGE_FAILED') {
        setPendingMessage(null);
        pendingMessageRef.current = null;
        sentMessageRef.current = null;
      }
      setFriendlyError(frame.code === 'MESSAGE_FAILED' ? t('sendFailed') : t('reconnectRequired'));
    }
  }, [refetchSessions, t]);

  const chat = useHermesChat({ onFrameAction: onFrame });
  const { attach, connectionState, send } = chat;
  const readyAgents = useMemo(
    () => (agentRoster?.agents ?? []).filter((agent) => agent.readiness === 'ready'),
    [agentRoster?.agents],
  );
  const activeSessionId =
    selectedSessionId ??
    (selectedAgentHandle
      ? sessions.find((session) => session.agentHandle === selectedAgentHandle)?.id ?? null
      : sessions[0]?.id ?? null);
  const selectedSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const currentAgent =
    readyAgents.find((agent) => agent.handle === selectedAgentHandle) ??
    readyAgents.find((agent) => agent.handle === selectedSession?.agentHandle) ??
    readyAgents[0] ??
    null;
  const canCompose = canComposeChat(currentAgent, connectionState);
  const hasInitialData = !agentsLoading && !sessionsLoading;

  useEffect(() => {
    if (!activeSessionId || connectionState !== 'connected' || attachedSessionId === activeSessionId) return;
    if (attachRequestedSessionRef.current === activeSessionId) return;
    attachRequestedSessionRef.current = activeSessionId;
    attach(activeSessionId);
  }, [activeSessionId, attach, attachedSessionId, connectionState]);

  useEffect(() => {
    if (
      !pendingMessage ||
      attachedSessionId !== pendingMessage.sessionId ||
      connectionState !== 'connected' ||
      sentMessageRef.current === pendingMessage.clientMessageId
    )
      return;
    const sent = send(pendingMessage.sessionId, pendingMessage.text, pendingMessage.clientMessageId);
    if (sent) sentMessageRef.current = pendingMessage.clientMessageId;
  }, [attachedSessionId, connectionState, pendingMessage, send]);

  useEffect(() => {
    if (
      !pendingMessage ||
      attachedSessionId !== pendingMessage.sessionId ||
      connectionState !== 'connected' ||
      sentMessageRef.current !== pendingMessage.clientMessageId
    )
      return;

    const timer = setTimeout(() => {
      if (
        pendingMessageRef.current?.clientMessageId === pendingMessage.clientMessageId &&
        sentMessageRef.current === pendingMessage.clientMessageId
      ) {
        attach(pendingMessage.sessionId);
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, [attach, attachedSessionId, connectionState, pendingMessage]);

  const selectSession = (session: HermesSessionSummary) => {
    setFriendlyError(null);
    setPendingMessage(null);
    pendingMessageRef.current = null;
    setSelectedSessionId(session.id);
    setSelectedAgentHandle(session.agentHandle);
    setMessages([]);
    setAttachedSessionId(null);
    attachRequestedSessionRef.current = null;
  };

  const createNewSession = async (agent: SharedAgent | null = currentAgent) => {
    if (!agent || createState.isLoading) return;
    setFriendlyError(null);
    setPendingMessage(null);
    pendingMessageRef.current = null;
    try {
      const result = await createSession({ agentHandle: agent.handle }).unwrap();
      setSelectedSessionId(result.session.id);
      setSelectedAgentHandle(agent.handle);
      setMessages(hydrateSnapshotMessages(result.snapshot));
      setAttachedSessionId(null);
      attachRequestedSessionRef.current = null;
      await refetchSessions();
      composerRef.current?.focus();
    } catch {
      setFriendlyError(t('startFailed'));
    }
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text || !canCompose) return;
    setFriendlyError(null);
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const result = await createSession({ agentHandle: currentAgent?.handle ?? '' }).unwrap();
        sessionId = result.session.id;
        setSelectedSessionId(sessionId);
        setSelectedAgentHandle(result.session.agentHandle);
        setMessages(hydrateSnapshotMessages(result.snapshot));
        setAttachedSessionId(null);
        attachRequestedSessionRef.current = null;
        await refetchSessions();
      } catch {
        setFriendlyError(t('startFailed'));
        return;
      }
    }
    const clientMessageId = crypto.randomUUID();
    const nextPendingMessage = { sessionId, text, clientMessageId };
    setMessages((current) => [
      ...current,
      { localId: clientMessageId, role: 'user', text, timestamp: new Date().toISOString(), rowId: null },
    ]);
    setDraft('');
    pendingMessageRef.current = nextPendingMessage;
    setPendingMessage(nextPendingMessage);
  };

  const handleRename = async (sessionId: string) => {
    const title = renameDraft.trim();
    if (!title) return;
    try {
      await renameSession({ sessionId, title }).unwrap();
      setRenamingSessionId(null);
      setRenameDraft('');
      await refetchSessions();
    } catch {
      setFriendlyError(t('renameFailed'));
    }
  };

  const handleClose = async (session: HermesSessionSummary) => {
    try {
      await closeSession(session.id).unwrap();
      if (selectedSessionId === session.id) {
        setAttachedSessionId(null);
        attachRequestedSessionRef.current = null;
      }
      await refetchSessions();
    } catch {
      setFriendlyError(t('closeFailed'));
    }
  };

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
    <div className={messages.length === 0 ? `${styles.workspace} ${styles.workspaceEmpty}` : styles.workspace}>
      <aside className={styles.sessionsPane} aria-label={t('sessions')}>
        <Group justify='space-between' className={styles.sessionsHeader} wrap='nowrap'>
          <Text fw={600}>{t('sessions')}</Text>
          <Tooltip label={t('newChat')}>
            <ActionIcon
              aria-label={t('newChat')}
              variant='subtle'
              onClick={() => void createNewSession()}
              loading={createState.isLoading}
              disabled={!currentAgent}
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <ScrollArea className={styles.sessionList} type='auto' offsetScrollbars>
          <Stack gap={4}>
            {sessions.map((session) => (
              <div
                className={`${styles.sessionItem} ${selectedSessionId === session.id ? styles.sessionItemActive : ''}`}
                key={session.id}
              >
                {renamingSessionId === session.id ? (
                  <TextInput
                    autoFocus
                    size='xs'
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleRename(session.id);
                      if (event.key === 'Escape') setRenamingSessionId(null);
                    }}
                    onBlur={() => void handleRename(session.id)}
                    aria-label={t('rename')}
                  />
                ) : (
                  <button type='button' className={styles.sessionButton} onClick={() => selectSession(session)}>
                    <Group gap='xs' wrap='nowrap' align='flex-start'>
                      <IconMessageCircle2 size={16} className={styles.sessionIcon} />
                      <div className={styles.sessionText}>
                        <Text size='sm' lineClamp={1} fw={selectedSessionId === session.id ? 600 : 400}>
                          {session.title || t('untitled')}
                        </Text>
                        <Text size='xs' c='dimmed' lineClamp={1}>
                          {session.preview || formatSessionDate(session.startedAt)}
                        </Text>
                      </div>
                    </Group>
                  </button>
                )}
                <Menu withinPortal position='bottom-end' shadow='sm'>
                  <Menu.Target>
                    <ActionIcon aria-label={t('sessionActions')} variant='subtle' size='sm' className={styles.sessionMenu}>
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      onClick={() => {
                        setRenamingSessionId(session.id);
                        setRenameDraft(session.title || '');
                      }}
                    >
                      {t('rename')}
                    </Menu.Item>
                    <Menu.Item color='red' leftSection={<IconArchive size={15} />} onClick={() => void handleClose(session)}>
                      {t('close')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
            ))}
          </Stack>
        </ScrollArea>
      </aside>

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
              onChange={(value) => {
                setSelectedAgentHandle(value);
                if (value !== selectedSession?.agentHandle) {
                  setSelectedSessionId(null);
                  setMessages([]);
                  setAttachedSessionId(null);
                  attachRequestedSessionRef.current = null;
                }
              }}
              rightSection={<IconChevronDown size={15} />}
              checkIconPosition='right'
              allowDeselect={false}
              className={styles.agentSelect}
            />
          </Group>
          {selectedSession?.active ? <span className={styles.liveDot} aria-hidden='true' /> : null}
        </Group>
        <Divider />

        <ScrollArea className={styles.messages} type='auto' offsetScrollbars viewportRef={undefined}>
          {messages.length ? (
            <Stack gap='lg' className={styles.messageStack}>
              {messages.map((message) => (
                <div key={message.localId} className={message.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow}>
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
              <ActionIcon aria-label={t('dismiss')} size='xs' variant='subtle' onClick={() => setFriendlyError(null)}>
                <IconX size={14} />
              </ActionIcon>
            </Group>
          ) : null}
          <Paper withBorder radius='lg' className={styles.composer}>
            <Textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              placeholder={currentAgent ? t('composerPlaceholder') : t('noAgent')}
              autosize
              minRows={1}
              maxRows={6}
              variant='unstyled'
              disabled={!canCompose}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
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
                onClick={() => void submit()}
                disabled={!draft.trim() || !canCompose || Boolean(pendingMessage)}
              >
                <IconSend2 size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        </Stack>
      </main>
    </div>
  );
}

export function snapshotContainsAssistantReply(snapshot: HermesSessionSnapshot, pendingText: string): boolean {
  const pendingUserIndex = snapshot.messages.reduce(
    (lastIndex, message, index) => (message.role === 'user' && message.text === pendingText ? index : lastIndex),
    -1,
  );
  return (
    pendingUserIndex >= 0 &&
    snapshot.messages.slice(pendingUserIndex + 1).some((message) => message.role === 'assistant')
  );
}

function hydrateSnapshotMessages(snapshot: HermesSessionSnapshot): LocalMessage[] {
  const hydrated: LocalMessage[] = snapshot.messages.map((message, index) => ({
    ...message,
    localId: `snapshot-${index}`,
  }));
  const inflight = snapshot.inflight;
  if (!inflight) return hydrated;

  if (inflight.user && hydrated.at(-1)?.text !== inflight.user) {
    hydrated.push({
      localId: 'inflight-user',
      role: 'user',
      text: inflight.user,
      timestamp: new Date().toISOString(),
      rowId: null,
    });
  }
  if (inflight.assistant) {
    const last = hydrated.at(-1);
    if (last?.role === 'assistant' && last.text === inflight.assistant) {
      hydrated[hydrated.length - 1] = { ...last, streaming: inflight.streaming };
    } else {
      hydrated.push({
        localId: 'inflight-assistant',
        role: 'assistant',
        text: inflight.assistant,
        timestamp: new Date().toISOString(),
        rowId: null,
        streaming: inflight.streaming,
      });
    }
  }
  return hydrated;
}

function formatSessionDate(value: string | null): string {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(value));
  } catch {
    return '';
  }
}
