import { describe, expect, it } from 'vitest';
import { maskEnvironmentMetadata, parseGithubRepositoryUrl } from './project.js';

describe('parseGithubRepositoryUrl', () => {
  it('normalizes a canonical GitHub HTTPS repository URL', () => {
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo')).toEqual({
      owner: 'acme',
      name: 'demo',
      url: 'https://github.com/acme/demo',
    });
  });

  it('normalizes the .git variant and a trailing slash to the same canonical URL', () => {
    const canonical = parseGithubRepositoryUrl('https://github.com/acme/demo');
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo.git')).toEqual(canonical);
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo/')).toEqual(canonical);
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo.git/')).toEqual(canonical);
  });

  it('canonicalizes owner and repository casing to one identity', () => {
    const canonical = parseGithubRepositoryUrl('https://github.com/acme/demo');
    expect(canonical).toEqual({
      owner: 'acme',
      name: 'demo',
      url: 'https://github.com/acme/demo',
    });
    expect(parseGithubRepositoryUrl('https://github.com/Acme/Demo')).toEqual(canonical);
    expect(parseGithubRepositoryUrl('https://github.com/ACME/Demo.git')).toEqual(canonical);
    expect(parseGithubRepositoryUrl('https://github.com/ACME/DEMO/')).toEqual(canonical);
    expect(parseGithubRepositoryUrl('https://GitHub.com/AcMe/DeMo')).toEqual(canonical);
  });

  it('strips a trailing .git suffix regardless of casing, so every variant collapses to one identity', () => {
    const canonical = {
      owner: 'acme',
      name: 'demo',
      url: 'https://github.com/acme/demo',
    };

    for (const variant of [
      'https://github.com/ACME/DEMO.GIT',
      'https://github.com/acme/demo.git',
      'https://github.com/Acme/Demo',
      'https://github.com/acme/demo',
    ]) {
      const parsed = parseGithubRepositoryUrl(variant);
      const name = parsed?.name ?? '';

      expect(parsed).toEqual(canonical);
      expect(name).toBe('demo');
      expect(name).not.toContain('.git');
    }
  });

  it('rejects credential-bearing URLs', () => {
    expect(parseGithubRepositoryUrl('https://user:secret@github.com/acme/demo')).toBeNull();
    expect(parseGithubRepositoryUrl('https://user@github.com/acme/demo')).toBeNull();
  });

  it('rejects query strings and fragments', () => {
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo?tab=readme')).toBeNull();
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo#readme')).toBeNull();
  });

  it('rejects non-GitHub hosts and non-HTTPS protocols', () => {
    expect(parseGithubRepositoryUrl('https://gitlab.com/acme/demo')).toBeNull();
    expect(parseGithubRepositoryUrl('https://git.example.com/acme/demo')).toBeNull();
    expect(parseGithubRepositoryUrl('http://github.com/acme/demo')).toBeNull();
    expect(parseGithubRepositoryUrl('git@github.com:acme/demo.git')).toBeNull();
  });

  it('rejects extra path segments', () => {
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo/tree/main')).toBeNull();
  });

  it('rejects an empty owner or repository name', () => {
    expect(parseGithubRepositoryUrl('https://github.com')).toBeNull();
    expect(parseGithubRepositoryUrl('https://github.com/acme')).toBeNull();
    expect(parseGithubRepositoryUrl('https://github.com/acme/')).toBeNull();
    expect(parseGithubRepositoryUrl('https://github.com//demo')).toBeNull();
  });

  it('rejects invalid owner or repository characters', () => {
    expect(parseGithubRepositoryUrl('https://github.com/acme/de mo')).toBeNull();
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo!')).toBeNull();
    expect(parseGithubRepositoryUrl('https://github.com/acme/demo~wip')).toBeNull();
  });

  it('rejects values that are not URLs at all', () => {
    expect(parseGithubRepositoryUrl('')).toBeNull();
    expect(parseGithubRepositoryUrl('not a url')).toBeNull();
  });
});

describe('maskEnvironmentMetadata', () => {
  it('maps every environment key to configured without returning the original values', () => {
    const masked = maskEnvironmentMetadata({
      DATABASE_URL: 'postgres://user:secret@localhost/db',
      API_TOKEN: 'super-secret-token',
      NODE_ENV: 'production',
    });

    expect(masked).toEqual({
      DATABASE_URL: 'configured',
      API_TOKEN: 'configured',
      NODE_ENV: 'configured',
    });
    expect(Object.values(masked).every((value) => value === 'configured')).toBe(true);
    expect(JSON.stringify(masked)).not.toContain('secret');
    expect(JSON.stringify(masked)).not.toContain('production');
  });

  it('returns an empty object for empty metadata', () => {
    expect(maskEnvironmentMetadata({})).toEqual({});
  });
});
