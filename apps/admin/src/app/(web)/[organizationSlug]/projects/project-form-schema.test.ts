import { describe, expect, it } from 'vitest'
import {
  EMPTY_PROJECT_FORM_VALUES,
  createProjectFormSchema,
  isGithubHttpsRepositoryUrl,
  parseEnvironmentMetadata,
  toProjectRequestBody,
  type ProjectFormMessages
} from './project-form-schema'

const messages: ProjectFormMessages = {
  nameMax: 'name-too-long',
  githubUrlRequired: 'url-required',
  githubUrlInvalid: 'url-invalid',
  sourceBranchRequired: 'source-required',
  targetBranchRequired: 'target-required',
  branchMax: 'branch-too-long',
  nodeVersionMax: 'node-too-long'
}

const formSchema = createProjectFormSchema(messages)

const validValues = {
  name: 'Project A',
  githubUrl: 'https://github.com/owner/repository',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: '22',
  environmentMetadata: 'DATABASE_URL'
}

describe('github repository URL validation', () => {
  it('accepts normalized GitHub HTTPS repository URLs', () => {
    expect(isGithubHttpsRepositoryUrl('https://github.com/owner/repository')).toBe(
      true
    )
    expect(
      isGithubHttpsRepositoryUrl('https://github.com/owner/repository.git')
    ).toBe(true)
    expect(isGithubHttpsRepositoryUrl('https://GitHub.com/owner/repository')).toBe(
      true
    )
  })

  it('rejects URLs the API domain rejects', () => {
    expect(isGithubHttpsRepositoryUrl('http://github.com/owner/repository')).toBe(
      false
    )
    expect(
      isGithubHttpsRepositoryUrl('https://user@github.com/owner/repository')
    ).toBe(false)
    expect(
      isGithubHttpsRepositoryUrl('https://github.com/owner/repository?ref=main')
    ).toBe(false)
    expect(
      isGithubHttpsRepositoryUrl('https://github.com/owner/repository#readme')
    ).toBe(false)
    expect(
      isGithubHttpsRepositoryUrl('https://gitlab.com/owner/repository')
    ).toBe(false)
    expect(isGithubHttpsRepositoryUrl('https://github.com/owner')).toBe(false)
    expect(isGithubHttpsRepositoryUrl('https://github.com/owner/repo/sub')).toBe(
      false
    )
    expect(isGithubHttpsRepositoryUrl('https://github.com/ow ner/repository')).toBe(
      false
    )
    expect(isGithubHttpsRepositoryUrl('')).toBe(false)
  })
})

describe('project form schema', () => {
  it('accepts the values the create and update forms submit', () => {
    expect(formSchema.parse(validValues)).toEqual(validValues)
  })

  it('mirrors the API bounds and required fields', () => {
    expect(() =>
      formSchema.parse({ ...validValues, name: 'a'.repeat(121) })
    ).toThrow()
    expect(() =>
      formSchema.parse({ ...validValues, githubUrl: '' })
    ).toThrow()
    expect(() =>
      formSchema.parse({ ...validValues, sourceBranch: 'a'.repeat(121) })
    ).toThrow()
    expect(() =>
      formSchema.parse({ ...validValues, nodeVersion: 'a'.repeat(41) })
    ).toThrow()
  })

  it('trims the submitted values', () => {
    expect(formSchema.parse({ ...validValues, name: '  Project A  ' })).toEqual({
      ...validValues,
      name: 'Project A'
    })
  })
})

describe('project form submission', () => {
  it('sends environment variable names with the masked value', () => {
    expect(
      parseEnvironmentMetadata('DATABASE_URL\nAPI_KEY\n\nDATABASE_URL')
    ).toEqual({
      DATABASE_URL: 'configured',
      API_KEY: 'configured'
    })
  })

  it('stores only the variable name when a whole .env line is pasted', () => {
    const parsed = parseEnvironmentMetadata('API_KEY=sk-live-abcdef123456')

    expect(parsed).toEqual({ API_KEY: 'configured' })
    expect(JSON.stringify(parsed)).not.toContain('sk-live')
    expect(JSON.stringify(parsed)).not.toContain('abcdef123456')
  })

  it('reduces KEY=value, KEY = value and a bare KEY to the same key', () => {
    expect(parseEnvironmentMetadata('KEY=value')).toEqual({ KEY: 'configured' })
    expect(parseEnvironmentMetadata('KEY = value')).toEqual({ KEY: 'configured' })
    expect(parseEnvironmentMetadata('KEY')).toEqual({ KEY: 'configured' })
  })

  it('drops entries whose name is not a valid environment variable name', () => {
    expect(
      parseEnvironmentMetadata(
        'API KEY\nAPI-KEY\nAPI$KEY\n1API_KEY\nAPI.KEY\n=value'
      )
    ).toEqual({})
  })

  it('keeps only the valid lines when valid and invalid lines are mixed', () => {
    expect(
      parseEnvironmentMetadata('DATABASE_URL=postgres://secret\nAPI-KEY=secret')
    ).toEqual({ DATABASE_URL: 'configured' })
  })

  it.each([
    'ghp_A1b2C3d4E5f6G7h8I9j0',
    'github_pat_11ABCDEFG0abcdefghij_kl',
    'sk_live_0123456789abcdef',
    'AKIAIOSFODNN7EXAMPLE',
    'npm_abcdefghijklmnop1234'
  ])(
    'drops the credential-shaped bare token %s instead of storing it as a key name',
    token => {
      expect(parseEnvironmentMetadata(token)).toEqual({})
    }
  )

  it.each([
    'ghp_16C7e42F292c6912E7710c838347Ae178B4a',
    'github_pat_11ABCDEFG0abcdefghij_klmnopqrstuvwxyz0123456789ABCDE',
    'sk_live_abcdef1234567890abcdef',
    'AKIAIOSFODNN7EXAMPLE',
    'npm_AbCdEf1234567890AbCdEf1234567890',
    'glpat-AbCdEf1234567890'
  ])('drops the token-shaped credential %s', token => {
    expect(parseEnvironmentMetadata(token)).toEqual({})
  })

  // Regression guard for the false positives of the first version: a credential prefix followed by
  // a merely long, word-like string is a legitimate variable name, not a token.
  it.each([
    'npm_package_lock_version',
    'sk_live_cache_ttl_seconds',
    'DATABASE_URL',
    'NODE_ENV',
    'npm_cache_dir',
    'AWS_REGION',
    'GITHUB_TOKEN',
    'API_KEY'
  ])('keeps the legitimate variable name %s', name => {
    expect(parseEnvironmentMetadata(name)).toEqual({ [name]: 'configured' })
  })

  it('keeps a prefixed name whose suffix is short and has no uppercase letter', () => {
    expect(parseEnvironmentMetadata('npm_lock_1')).toEqual({
      npm_lock_1: 'configured'
    })
  })

  it('keeps ordinary variable names while dropping credential-shaped lines', () => {
    expect(
      parseEnvironmentMetadata(
        'DATABASE_URL\nNODE_ENV\ngithub_pat_11ABCDEFG0abcdefghij_kl\nnpm_cache_dir'
      )
    ).toEqual({
      DATABASE_URL: 'configured',
      NODE_ENV: 'configured',
      npm_cache_dir: 'configured'
    })
  })

  it('trims every request body field', () => {
    expect(
      toProjectRequestBody({
        ...validValues,
        name: '  Project A  ',
        githubUrl: ' https://github.com/owner/repository ',
        environmentMetadata: ''
      })
    ).toEqual({
      name: 'Project A',
      githubUrl: 'https://github.com/owner/repository',
      sourceBranch: 'main',
      targetBranch: 'main',
      nodeVersion: '22',
      environmentMetadata: {}
    })
  })

  it('keeps empty default values valid for the create form', () => {
    expect(EMPTY_PROJECT_FORM_VALUES.environmentMetadata).toBe('')
    expect(EMPTY_PROJECT_FORM_VALUES.sourceBranch).toBe('main')
    expect(EMPTY_PROJECT_FORM_VALUES.targetBranch).toBe('main')
  })
})
