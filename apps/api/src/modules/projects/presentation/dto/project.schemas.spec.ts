import { describe, expect, it } from 'vitest';
import { createProjectSchema, updateProjectSchema } from './project.schemas.js';

const request = {
  githubUrl: 'https://github.com/acme/demo',
};

describe('createProjectSchema environment metadata', () => {
  it('accepts environment variable names as keys', () => {
    const parsed = createProjectSchema.parse({
      ...request,
      environmentMetadata: {
        DATABASE_URL: 'do-not-store-this',
        API_TOKEN: 'do-not-store-this',
        NODE_ENV: 'do-not-store-this',
        npm_cache_dir: 'do-not-store-this',
      },
    });

    expect(parsed.environmentMetadata).toEqual({
      DATABASE_URL: 'do-not-store-this',
      API_TOKEN: 'do-not-store-this',
      NODE_ENV: 'do-not-store-this',
      npm_cache_dir: 'do-not-store-this',
    });
  });

  it('defaults omitted environment metadata to an empty record', () => {
    expect(createProjectSchema.parse(request).environmentMetadata).toEqual({});
  });

  it('rejects a key that smuggles a pasted value', () => {
    expect(() =>
      createProjectSchema.parse({
        ...request,
        environmentMetadata: { 'API_KEY=sk-live-abcdef123456': 'configured' },
      }),
    ).toThrow();
  });

  it.each(['API KEY', 'API-KEY', 'API$KEY', '1API_KEY', 'API.KEY', 'API_KEY=value'])(
    'rejects the invalid variable name %s',
    (name) => {
      expect(() =>
        createProjectSchema.parse({
          ...request,
          environmentMetadata: { [name]: 'configured' },
        }),
      ).toThrow();
    },
  );

  it.each([
    'ghp_A1b2C3d4E5f6G7h8I9j0',
    'github_pat_11ABCDEFG0abcdefghij_kl',
    'sk_live_0123456789abcdef',
    'AKIAIOSFODNN7EXAMPLE',
    'npm_abcdefghijklmnop1234',
  ])('rejects the credential-shaped key name %s', (name) => {
    expect(() =>
      createProjectSchema.parse({
        ...request,
        environmentMetadata: { [name]: 'configured' },
      }),
    ).toThrow();
  });
});

describe('createProjectSchema create-time defaults', () => {
  it('still produces the documented defaults for a minimal body', () => {
    expect(createProjectSchema.parse(request)).toEqual({
      name: '',
      githubUrl: 'https://github.com/acme/demo',
      sourceBranch: 'main',
      targetBranch: 'main',
      nodeVersion: '',
      environmentMetadata: {},
    });
  });
});

describe('updateProjectSchema partial bodies', () => {
  // Discriminating assertion: with the old `.partial()` shape over a schema that carries
  // defaults, every one of these keys came back populated with create-time defaults instead of
  // `undefined`, so a partial PATCH silently reset the fields the client never sent.
  it('leaves every omitted field undefined instead of applying create-time defaults', () => {
    const parsed = updateProjectSchema.parse({ sourceBranch: 'release' });

    expect(parsed.sourceBranch).toBe('release');
    expect(parsed.targetBranch).toBeUndefined();
    expect(parsed.name).toBeUndefined();
    expect(parsed.nodeVersion).toBeUndefined();
    expect(parsed.environmentMetadata).toBeUndefined();
  });

  it('leaves every field undefined for an empty body', () => {
    const parsed = updateProjectSchema.parse({});

    expect(parsed.name).toBeUndefined();
    expect(parsed.githubUrl).toBeUndefined();
    expect(parsed.sourceBranch).toBeUndefined();
    expect(parsed.targetBranch).toBeUndefined();
    expect(parsed.nodeVersion).toBeUndefined();
    expect(parsed.environmentMetadata).toBeUndefined();
  });

  it('still validates the shared field rules and the environment key pattern', () => {
    expect(() => updateProjectSchema.parse({ sourceBranch: '' })).toThrow();
    expect(() =>
      updateProjectSchema.parse({ environmentMetadata: { 'API_KEY=value': 'configured' } }),
    ).toThrow();
  });
});
