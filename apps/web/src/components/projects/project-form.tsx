'use client'

import { ApiError, createProject, updateProject, type Project } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type Props = { project?: Project }

export function ProjectForm({ project }: Props) {
  const router = useRouter()
  const [name, setName] = useState(project?.name || '')
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl || '')
  const [sourceBranch, setSourceBranch] = useState(
    project?.sourceBranch || 'main'
  )
  const [targetBranch, setTargetBranch] = useState(
    project?.targetBranch || 'main'
  )
  const [nodeVersion, setNodeVersion] = useState(project?.nodeVersion || '')
  const [environmentKeys, setEnvironmentKeys] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const environmentMetadata = Object.fromEntries(
        environmentKeys
          .split(',')
          .map(key => key.trim())
          .filter(Boolean)
          .map(key => [key, 'configured'])
      )
      const input = {
        name,
        githubUrl,
        sourceBranch,
        targetBranch,
        nodeVersion,
        environmentMetadata
      }
      if (project) await updateProject(project.id, input)
      else await createProject(input)
      router.push(project ? `/projects/${project.id}` : '/projects')
      router.refresh()
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'บันทึก project ไม่สำเร็จ'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className='card form' onSubmit={submit}>
      <div>
        <span className='eyebrow'>Metadata only</span>
        <h2>{project ? 'Edit project' : 'Add project'}</h2>
        <p className='muted'>
          Phase 1 จะเก็บข้อมูล repository เท่านั้น ยังไม่ clone, ไม่สร้าง
          sandbox และไม่เรียก Hermes
        </p>
      </div>
      {error ? <div className='error'>{error}</div> : null}
      <div className='grid grid-2'>
        <div className='field'>
          <label htmlFor='project-name'>Name (optional)</label>
          <input
            id='project-name'
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder='ใช้ชื่อ repository หากเว้นว่าง'
            maxLength={120}
          />
        </div>
        <div className='field'>
          <label htmlFor='github-url'>GitHub repository URL</label>
          <input
            id='github-url'
            required
            value={githubUrl}
            onChange={event => setGithubUrl(event.target.value)}
            placeholder='https://github.com/owner/repository'
          />
        </div>
        <div className='field'>
          <label htmlFor='source-branch'>Source branch</label>
          <input
            id='source-branch'
            required
            value={sourceBranch}
            onChange={event => setSourceBranch(event.target.value)}
          />
        </div>
        <div className='field'>
          <label htmlFor='target-branch'>Target branch</label>
          <input
            id='target-branch'
            required
            value={targetBranch}
            onChange={event => setTargetBranch(event.target.value)}
          />
        </div>
        <div className='field'>
          <label htmlFor='node-version'>Node.js version</label>
          <input
            id='node-version'
            value={nodeVersion}
            onChange={event => setNodeVersion(event.target.value)}
            placeholder='เช่น 22'
          />
        </div>
        <div className='field'>
          <label htmlFor='environment-keys'>
            Environment key names (optional)
          </label>
          <input
            id='environment-keys'
            value={environmentKeys}
            onChange={event => setEnvironmentKeys(event.target.value)}
            placeholder='DATABASE_URL, API_URL'
          />
          <small className='muted'>
            เก็บเฉพาะชื่อ key เป็น configured ไม่เก็บค่า secret
          </small>
        </div>
      </div>
      <div className='actions'>
        <button className='button' disabled={saving} type='submit'>
          {saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </button>
        <button
          className='button secondary'
          type='button'
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
