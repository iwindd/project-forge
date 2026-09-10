export type ProjectsViewState = 'loading' | 'error' | 'empty' | 'list'

export type ProjectFailureMessages = {
  conflict: string
  forbidden: string
  notFound: string
}

/**
 * Derives which of the four mutually exclusive screen states the Project list
 * renders. The organization context wins over the query because the list
 * request is skipped until an active organization is resolved.
 */
export function getProjectsViewState({
  organizationLoading,
  projectsError,
  projectsFetching,
  projectCount
}: {
  organizationLoading: boolean
  projectsError: boolean
  projectsFetching: boolean
  projectCount: number
}): ProjectsViewState {
  if (organizationLoading) return 'loading'
  if (projectsError) return 'error'
  if (projectsFetching && projectCount === 0) return 'loading'

  return projectCount > 0 ? 'list' : 'empty'
}

/**
 * Maps the RTK Query error status the browser API root exposes to the message
 * shown to the user, falling back to the caller's own copy.
 */
export function failureMessageFor(
  error: unknown,
  fallback: string,
  messages: ProjectFailureMessages
): string {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined

  switch (status) {
    case 409:
      return messages.conflict
    case 403:
      return messages.forbidden
    case 404:
      return messages.notFound
    default:
      return fallback
  }
}
