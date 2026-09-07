'use client'

import { ApiError, archiveProject, getProjects, type Project } from '@/lib/api'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      setProjects((await getProjects()).projects)
      setError('')
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError ? cause.message : 'โหลด projects ไม่สำเร็จ'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function archive(id: string) {
    if (!window.confirm('Archive project นี้หรือไม่?')) return
    try {
      await archiveProject(id)
      await load()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Archive ไม่สำเร็จ')
    }
  }

  return (
    <div className='content'>
      <div className='page-heading'>
        <div>
          <span className='eyebrow'>Project registry</span>
          <h2>Projects</h2>
          <p className='muted'>เก็บ repository ที่จะต่อยอดใน phase ถัดไป</p>
        </div>
        <Link className='button' href='/projects/new'>
          Add project
        </Link>
      </div>
      <div className='notice'>
        Phase 1 เป็น metadata-only: การเพิ่ม project ยังไม่ clone, ไม่สร้าง
        sandbox, ไม่ install, ไม่ build และไม่สร้าง Hermes session
      </div>
      {error ? <div className='error spacing-top'>{error}</div> : null}
      {loading ? (
        <div className='card spacing-top'>
          <p className='muted'>กำลังโหลด projects…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className='card empty spacing-top'>
          <h3>ยังไม่มี project</h3>
          <p className='muted'>
            เพิ่ม GitHub repository แรกเพื่อเตรียมระบบสำหรับ Phase 2
          </p>
          <Link className='button' href='/projects/new'>
            Add your first project
          </Link>
        </div>
      ) : (
        <div className='project-grid spacing-top'>
          {projects.map(project => (
            <article className='card project-card' key={project.id}>
              <div className='project-card-header'>
                <div>
                  <span className='badge good'>{project.status}</span>
                  <h3>{project.name}</h3>
                </div>
                <span className='muted'>
                  {project.githubOwner}/{project.githubRepo}
                </span>
              </div>
              <dl className='metadata'>
                <div>
                  <dt>Branches</dt>
                  <dd>
                    {project.sourceBranch} → {project.targetBranch}
                  </dd>
                </div>
                <div>
                  <dt>Node</dt>
                  <dd>{project.nodeVersion || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>
                    {new Date(project.createdAt).toLocaleDateString('th-TH')}
                  </dd>
                </div>
              </dl>
              <div className='actions'>
                <Link
                  className='button secondary'
                  href={`/projects/${project.id}`}
                >
                  Open
                </Link>
                <button
                  className='button danger'
                  type='button'
                  onClick={() => void archive(project.id)}
                >
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
