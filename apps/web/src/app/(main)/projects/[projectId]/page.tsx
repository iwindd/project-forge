'use client'

import { ProjectForm } from '@/components/projects/project-form'
import { ApiError, getProject, type Project } from '@/lib/api'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    getProject(params.projectId)
      .then(({ project: current }) => setProject(current))
      .catch((cause: unknown) =>
        setError(
          cause instanceof ApiError ? cause.message : 'โหลด project ไม่สำเร็จ'
        )
      )
  }, [params.projectId])
  if (error)
    return (
      <div className='content'>
        <div className='error'>{error}</div>
      </div>
    )
  if (!project)
    return (
      <div className='content'>
        <div className='card'>
          <p className='muted'>กำลังโหลด project…</p>
        </div>
      </div>
    )
  return (
    <div className='content'>
      <div className='page-heading'>
        <div>
          <Link className='text-link' href='/projects'>
            ← Projects
          </Link>
          <h2>{project.name}</h2>
          <p className='muted'>{project.githubUrl}</p>
        </div>
        <span
          className={`badge ${project.status === 'ACTIVE' ? 'good' : 'bad'}`}
        >
          {project.status}
        </span>
      </div>
      <ProjectForm project={project} />
    </div>
  )
}
