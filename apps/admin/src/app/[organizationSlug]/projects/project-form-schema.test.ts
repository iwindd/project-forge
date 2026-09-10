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
