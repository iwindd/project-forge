'use client';

import { ActionIcon, Center, Loader, Stack, Text } from '@mantine/core';
import { IconMessageCircle2, IconRefresh, IconSparkles } from '@tabler/icons-react';
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
import type { HermesSessionSnapshot, HermesSessionSummary } from '@/lib/features/hermes-sessions/hermes-sessions-schemas';
import {
  useHermesChat,
  type HermesChatConnectionState,
  type HermesChatFrame,
} from '@/lib/features/hermes-sessions/use-hermes-chat';
import { HermesChatConversation } from './hermes-chat-conversation';
import { HermesChatSessionList } from './hermes-chat-session-list';
import type { LocalMessage } from './hermes-chat-types';
import styles from './hermes-chat-workspace.module.css';

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

  const selectAgent = (value: string | null) => {
    setSelectedAgentHandle(value);
    if (value !== selectedSession?.agentHandle) {
      setSelectedSessionId(null);
      setMessages([]);
      setAttachedSessionId(null);
      attachRequestedSessionRef.current = null;
    }
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

  const renameSessionAction = async (sessionId: string, title: string): Promise<boolean> => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return false;
    try {
      await renameSession({ sessionId, title: normalizedTitle }).unwrap();
      await refetchSessions();
      return true;
    } catch {
      setFriendlyError(t('renameFailed'));
      return false;
    }
  };

  const closeSessionAction = async (session: HermesSessionSummary) => {
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
      <HermesChatSessionList
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        canCreateNewChat={Boolean(currentAgent)}
        newChatLoading={createState.isLoading}
        selectSessionAction={selectSession}
        newChatAction={() => void createNewSession()}
        renameSessionAction={renameSessionAction}
        closeSessionAction={(session) => void closeSessionAction(session)}
      />
      <HermesChatConversation
        currentAgent={currentAgent}
        selectedSession={selectedSession}
        readyAgents={readyAgents}
        messages={messages}
        draft={draft}
        canCompose={canCompose}
        pendingMessage={Boolean(pendingMessage)}
        friendlyError={friendlyError}
        composerRef={composerRef}
        selectAgentAction={selectAgent}
        draftChangeAction={setDraft}
        submitAction={() => void submit()}
        dismissErrorAction={() => setFriendlyError(null)}
      />
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
