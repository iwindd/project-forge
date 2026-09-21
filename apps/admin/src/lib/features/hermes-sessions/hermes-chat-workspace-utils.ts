import type { SharedAgent } from '@/lib/features/hermes-agents/hermes-agents-schemas';
import type { HermesSessionSnapshot } from './hermes-sessions-schemas';
import type { HermesChatConnectionState } from './use-hermes-chat';
import type { LocalMessage } from '@/components/hermes-chat-types';

export function canComposeChat(currentAgent: SharedAgent | null, connectionState: HermesChatConnectionState): boolean {
  const transportAllowsDraft =
    connectionState === 'connecting' || connectionState === 'connected' || connectionState === 'offline';
  return Boolean(currentAgent) && transportAllowsDraft;
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

export function hydrateSnapshotMessages(snapshot: HermesSessionSnapshot): LocalMessage[] {
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
