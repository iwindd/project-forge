'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHermesChatTitles } from '@/components/hermes-chat-title-context';
import { useGetSharedAgentsQuery } from '@/lib/features/hermes-agents/hermes-agents-api';
import { useCreateHermesSessionMutation, useGetHermesSessionsQuery } from './hermes-sessions-api';
import type { HermesSessionSummary } from './hermes-sessions-schemas';
import {
  useHermesChat,
  type HermesChatFrame,
} from './use-hermes-chat';
import { canComposeChat, hydrateSnapshotMessages, snapshotContainsAssistantReply } from './hermes-chat-workspace-utils';
import type { LocalMessage } from '@/components/hermes-chat-types';
import { getPath } from '@/routes';

type PendingMessage = { sessionId: string; text: string; clientMessageId: string };
type RetryMode = 'create' | 'send' | null;

type HermesChatRouteParams = {
  sessionId?: string;
};

export type HermesChatConversationMode = 'new' | 'loading' | 'not-found' | 'active';

export function useHermesChatWorkspace() {
  const t = useTranslations('Chat');
  const { setTitleAction } = useHermesChatTitles();
  const router = useRouter();
  const { sessionId: rawSessionId } = useParams<HermesChatRouteParams>();
  const routeSessionId = typeof rawSessionId === 'string' ? rawSessionId : null;
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
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [localSession, setLocalSession] = useState<HermesSessionSummary | null>(null);
  const [selectedAgentHandle, setSelectedAgentHandle] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [messagesSessionId, setMessagesSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingFirstPrompt, setPendingFirstPrompt] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [attachedSessionId, setAttachedSessionId] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [retryMode, setRetryMode] = useState<RetryMode>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const previousRouteSessionIdRef = useRef<string | null>(routeSessionId);
  const attachRequestedSessionRef = useRef<string | null>(null);
  const pendingMessageRef = useRef<PendingMessage | null>(null);
  const sentMessageRef = useRef<string | null>(null);
  const creatingFirstSessionRef = useRef(false);

  const readyAgents = useMemo(
    () => (agentRoster?.agents ?? []).filter((agent) => agent.readiness === 'ready'),
    [agentRoster?.agents],
  );
  const activeSessionId = routeSessionId ?? localSessionId;
  const selectedSession =
    sessions.find((session) => session.id === activeSessionId) ??
    (localSession?.id === activeSessionId ? localSession : null);
  const currentAgent = activeSessionId
    ? readyAgents.find((agent) => agent.handle === selectedSession?.agentHandle) ?? null
    : readyAgents.find((agent) => agent.handle === selectedAgentHandle) ?? readyAgents[0] ?? null;

  useEffect(() => {
    const previousRouteSessionId = previousRouteSessionIdRef.current;
    const preservingLocalSession = Boolean(routeSessionId && routeSessionId === localSessionId);
    previousRouteSessionIdRef.current = routeSessionId;

    if (previousRouteSessionId === routeSessionId || preservingLocalSession) return;

    setLocalSessionId(null);
    setLocalSession(null);
    setMessages([]);
    setMessagesSessionId(null);
    setDraft('');
    setPendingFirstPrompt(null);
    setPendingMessage(null);
    pendingMessageRef.current = null;
    sentMessageRef.current = null;
    setAttachedSessionId(null);
    attachRequestedSessionRef.current = null;
    setFriendlyError(null);
    setRetryMode(null);
  }, [localSessionId, routeSessionId]);

  const onFrame = useCallback(
    (frame: HermesChatFrame) => {
      if (frame.type === 'ready') {
        setAttachedSessionId(null);
        attachRequestedSessionRef.current = null;
        return;
      }
      if (frame.type === 'snapshot') {
        if (activeSessionId && frame.session.sessionId !== activeSessionId) return;
        const hydrated = hydrateSnapshotMessages(frame.session);
        const queuedMessage = pendingMessageRef.current;
        setMessagesSessionId(frame.session.sessionId);
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
          setRetryMode(null);
        }
        setAttachedSessionId(frame.session.sessionId);
        return;
      }
      if (activeSessionId && 'sessionId' in frame && frame.sessionId !== activeSessionId) return;
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
        setRetryMode(null);
        return;
      }
      if (frame.type === 'session.updated') {
        setTitleAction(frame.sessionId, frame.title);
        setLocalSession((current) => (current?.id === frame.sessionId ? { ...current, title: frame.title } : current));
        void refetchSessions();
        return;
      }
      if (frame.type === 'error') {
        if (pendingMessageRef.current) setRetryMode('send');
        setFriendlyError(frame.code === 'MESSAGE_FAILED' ? t('sendFailed') : t('reconnectRequired'));
      }
    },
    [activeSessionId, refetchSessions, setTitleAction, t],
  );

  const chat = useHermesChat({ onFrameAction: onFrame });
  const { attach, connectionState, send } = chat;
  const canCompose = canComposeChat(currentAgent, connectionState);
  const hasInitialData = !agentsLoading && !sessionsLoading;
  const conversationMode: HermesChatConversationMode = !activeSessionId
    ? 'new'
    : selectedSession
      ? 'active'
      : sessionsLoading
        ? 'loading'
        : 'not-found';

  useEffect(() => {
    if (!activeSessionId || !selectedSession || connectionState !== 'connected' || attachedSessionId === activeSessionId) return;
    if (attachRequestedSessionRef.current === activeSessionId) return;
    attachRequestedSessionRef.current = activeSessionId;
    attach(activeSessionId);
  }, [activeSessionId, attach, attachedSessionId, connectionState, selectedSession]);

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
  }, [attachedSessionId, connectionState, pendingMessage, retryNonce, send]);

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

  const selectAgentAction = (value: string | null) => {
    if (activeSessionId) return;
    setSelectedAgentHandle(value);
    setFriendlyError(null);
  };

  const enqueueMessage = (sessionId: string, text: string, clientMessageId: string) => {
    const nextPendingMessage = { sessionId, text, clientMessageId };
    setMessagesSessionId(sessionId);
    setMessages((current) => [
      ...current,
      { localId: clientMessageId, role: 'user', text, timestamp: new Date().toISOString(), rowId: null },
    ]);
    pendingMessageRef.current = nextPendingMessage;
    setPendingMessage(nextPendingMessage);
  };

  const submitAction = async () => {
    const text = draft.trim();
    if (!text || !canCompose || pendingMessageRef.current || creatingFirstSessionRef.current) return;

    setFriendlyError(null);
    setRetryMode(null);
    const clientMessageId = crypto.randomUUID();

    if (activeSessionId) {
      setDraft('');
      enqueueMessage(activeSessionId, text, clientMessageId);
      return;
    }

    if (!currentAgent) return;
    creatingFirstSessionRef.current = true;
    setPendingFirstPrompt(text);
    setDraft('');

    try {
      const result = await createSession({ agentHandle: currentAgent.handle }).unwrap();
      setLocalSessionId(result.session.id);
      setLocalSession(result.session);
      setTitleAction(result.session.id, result.session.title || text);
      setMessages(hydrateSnapshotMessages(result.snapshot));
      setAttachedSessionId(null);
      attachRequestedSessionRef.current = null;
      setPendingFirstPrompt(null);
      enqueueMessage(result.session.id, text, clientMessageId);
      router.replace(getPath('hermes.chat.session', { sessionId: result.session.id }), { scroll: false });
      void refetchSessions();
    } catch {
      setPendingFirstPrompt(null);
      setDraft(text);
      setRetryMode('create');
      setFriendlyError(t('startFailed'));
    } finally {
      creatingFirstSessionRef.current = false;
    }
  };

  const retryAction = () => {
    if (retryMode === 'create') {
      setFriendlyError(null);
      setRetryMode(null);
      void submitAction();
      return;
    }
    if (retryMode === 'send' && pendingMessageRef.current) {
      setFriendlyError(null);
      setRetryMode(null);
      sentMessageRef.current = null;
      setRetryNonce((current) => current + 1);
    }
  };

  return {
    agentRoster,
    agentError,
    sessionsError,
    refetchAgents,
    readyAgents,
    currentAgent,
    selectedSession,
    conversationMode,
    messages: messagesSessionId === activeSessionId ? messages : [],
    draft,
    canCompose: canCompose && !pendingFirstPrompt && !createState.isLoading,
    pendingMessage: Boolean(pendingMessage),
    friendlyError,
    retryAvailable: retryMode !== null,
    composerRef,
    selectAgentAction,
    draftChangeAction: setDraft,
    submitAction: () => void submitAction(),
    retryAction,
    dismissErrorAction: () => {
      setFriendlyError(null);
      setRetryMode(null);
    },
    hasInitialData,
  };
}
