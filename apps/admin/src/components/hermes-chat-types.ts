import type { HermesChatMessage } from '@/lib/features/hermes-sessions/hermes-sessions-schemas';

export type LocalMessage = HermesChatMessage & {
  localId: string;
  streaming?: boolean;
};
