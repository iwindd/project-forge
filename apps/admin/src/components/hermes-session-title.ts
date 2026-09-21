import type { HermesSessionSummary } from '@/lib/features/hermes-sessions/hermes-sessions-schemas';

export function getHermesSessionDisplayTitle(
  session: Pick<HermesSessionSummary, 'title' | 'preview'> | null | undefined,
  fallback = 'Chat',
): string {
  const title = session?.title.trim();
  if (title) return title;

  const preview = session?.preview.trim();
  return preview || fallback;
}

export function getHermesChatHeaderTitle(
  agentName: string | null | undefined,
  session: Pick<HermesSessionSummary, 'title' | 'preview'> | null | undefined,
  fallback = 'Chat',
): string {
  const title = getHermesSessionDisplayTitle(session, fallback);
  const normalizedAgentName = agentName?.trim();
  return normalizedAgentName ? `${normalizedAgentName} · ${title}` : title;
}
