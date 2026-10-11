import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '@/components/ui/loading-state'
import { projectService } from '@/services/projects'

/** Legacy top-level routes (e.g. /commitments) need a project context.
 *  Redirect to the first real project's matching tab instead of a
 *  hardcoded project id. */
export function FirstProjectRedirect({ tab }: { tab?: string }) {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    projectService.getAll().then((projects) => {
      if (cancelled) return
      if (projects.length > 0) {
        navigate(`/projects/${projects[0].id}${tab ? `/${tab}` : ''}`, { replace: true })
      } else {
        navigate('/projects', { replace: true })
      }
    })
    return () => {
      cancelled = true
    }
  }, [tab, navigate])

  return <LoadingState message="Loading workspace..." />
}
