# Transactional business audit

**Status: accepted.** A successful state-changing use-case records its business audit event through an `AuditPort` in the same UnitOfWork as the mutation, so the state and audit record commit or fail together. Controllers and other modules do not persist audit records directly; security failures are handled as a separate security-audit concern.
