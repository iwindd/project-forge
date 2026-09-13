import { describe, expect, it } from 'vitest';
import { failureMessageFor, getProjectsViewState, type ProjectFailureMessages } from './projects-view-state';

const baseState = {
  organizationLoading: false,
  projectsError: false,
  projectsFetching: false,
  projectCount: 0,
};

describe('getProjectsViewState', () => {
  it('reports loading while the organization context resolves', () => {
    expect(getProjectsViewState({ ...baseState, organizationLoading: true })).toBe('loading');
  });

  it('reports loading while the first page is fetching without results', () => {
    expect(getProjectsViewState({ ...baseState, projectsFetching: true })).toBe('loading');
  });

  it('reports error when the request failed', () => {
    expect(getProjectsViewState({ ...baseState, projectsError: true })).toBe('error');
  });

  it('prefers loading over error while the organization context resolves', () => {
    expect(
      getProjectsViewState({
        ...baseState,
        organizationLoading: true,
        projectsError: true,
      }),
    ).toBe('loading');
  });

  it('reports empty when the request succeeded without projects', () => {
    expect(getProjectsViewState(baseState)).toBe('empty');
  });

  it('reports list when projects are present', () => {
    expect(getProjectsViewState({ ...baseState, projectCount: 2 })).toBe('list');
  });

  it('keeps the list while existing projects are refetching', () => {
    expect(
      getProjectsViewState({
        ...baseState,
        projectsFetching: true,
        projectCount: 1,
      }),
    ).toBe('list');
  });
});

describe('failureMessageFor', () => {
  const messages: ProjectFailureMessages = {
    conflict: 'conflict-message',
    forbidden: 'forbidden-message',
    notFound: 'not-found-message',
  };

  it('maps a conflict status to the conflict message', () => {
    expect(failureMessageFor({ status: 409 }, 'fallback', messages)).toBe('conflict-message');
  });

  it('maps a forbidden status to the forbidden message', () => {
    expect(failureMessageFor({ status: 403 }, 'fallback', messages)).toBe('forbidden-message');
  });

  it('maps a not-found status to the not-found message', () => {
    expect(failureMessageFor({ status: 404 }, 'fallback', messages)).toBe('not-found-message');
  });

  it('falls back for any other status', () => {
    expect(failureMessageFor({ status: 500 }, 'fallback', messages)).toBe('fallback');
    expect(failureMessageFor({ status: 401 }, 'fallback', messages)).toBe('fallback');
  });

  it('falls back for errors without a status', () => {
    expect(failureMessageFor(new Error('boom'), 'fallback', messages)).toBe('fallback');
    expect(failureMessageFor(null, 'fallback', messages)).toBe('fallback');
    expect(failureMessageFor(undefined, 'fallback', messages)).toBe('fallback');
    expect(failureMessageFor('boom', 'fallback', messages)).toBe('fallback');
  });
});
