// Page title and breadcrumb label for each route (react-router `handle`).
import { useEffect } from 'react'
import { useMatches, type Params } from 'react-router-dom'

export type RouteHandle = {
  /** Page title shown in the top bar and the browser tab. */
  title?: string
  /** Breadcrumb label; a function receives the route params. */
  crumb?: string | ((params: Params) => string)
}

export type Crumb = { label: string; to: string }

export function useRouteMeta(): { title: string | undefined; crumbs: Crumb[] } {
  const matches = useMatches()
  let title: string | undefined
  const crumbs: Crumb[] = []
  for (const match of matches) {
    const handle = match.handle as RouteHandle | undefined
    if (!handle) continue
    if (handle.title) title = handle.title
    if (handle.crumb) {
      const label = typeof handle.crumb === 'function' ? handle.crumb(match.params) : handle.crumb
      crumbs.push({ label, to: match.pathname })
    }
  }
  return { title, crumbs }
}

export const APP_NAME = 'InnovProcure'

/** Sets the browser tab title. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title && title !== APP_NAME ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
