export const SECURITY_LOGGER = Symbol('SECURITY_LOGGER');

export type SecurityLogInput = {
  organizationId?: string | null;
  userId?: string | null;
  event: string;
  provider?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export interface SecurityLogPort {
  record(input: SecurityLogInput): Promise<void>;
}
