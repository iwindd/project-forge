import { describe, expect, it } from 'vitest';
import { createProjectSchema } from './project.schemas.js';

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
      },
    });

    expect(parsed.environmentMetadata).toEqual({
      DATABASE_URL: 'do-not-store-this',
      API_TOKEN: 'do-not-store-this',
      NODE_ENV: 'do-not-store-this',
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
});
