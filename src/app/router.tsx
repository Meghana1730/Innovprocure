import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { RequireDashboard } from '@/components/layout/RequireDashboard'
import type { RouteHandle } from '@/components/layout/route-meta'
import { RouteError } from '@/components/RouteError'
import { LoadingState } from '@/components/states'
import { useSession } from '@/lib/auth/session'
import type { Dashboard } from '@/lib/demo/selectors'

// Pages are loaded on demand so the first screen stays small.
function page(load: () => Promise<{ default: ComponentType }>, dashboard?: Dashboard) {
  const Page = lazy(load)
  const content = (
    <Suspense fallback={<LoadingState rows={4} />}>
      <Page />
    </Suspense>
  )
  return dashboard ? <RequireDashboard dashboard={dashboard}>{content}</RequireDashboard> : content
}

/** Sends a signed-in visitor to their own dashboard (the shell handles signed-out visitors). */
function Home() {
  const session = useSession()
  return <Navigate to={session?.home ?? '/login'} replace />
}

const h = (handle: RouteHandle) => handle

// A sign-in page and three dashboards, one per side of the mechanism.
export const router = createBrowserRouter([
  {
    path: '/login',
    element: page(() => import('@/pages/LoginPage')),
    errorElement: <RouteError />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'government',
        handle: h({ title: 'Government dashboard' }),
        element: page(() => import('@/pages/GovernmentPage'), 'government'),
      },
      {
        path: 'startup',
        handle: h({ title: 'Startup dashboard' }),
        element: page(() => import('@/pages/StartupPage'), 'startup'),
      },
      {
        path: 'experts',
        handle: h({ title: 'Expert dashboard' }),
        element: page(() => import('@/pages/ExpertsPage'), 'experts'),
      },
      { path: '*', element: <Home /> },
    ],
  },
])
