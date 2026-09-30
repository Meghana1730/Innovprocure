import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import type { RouteHandle } from '@/components/layout/route-meta'
import { RouteError } from '@/components/RouteError'
import { LoadingState } from '@/components/states'

// Pages are loaded on demand so the first screen stays small.
function page(load: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(load)
  return (
    <Suspense fallback={<LoadingState rows={4} />}>
      <Page />
    </Suspense>
  )
}

const h = (handle: RouteHandle) => handle

// Three dashboards, one per side of the mechanism.
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/government" replace /> },
      {
        path: 'government',
        handle: h({ title: 'Government dashboard' }),
        element: page(() => import('@/pages/GovernmentPage')),
      },
      {
        path: 'startup',
        handle: h({ title: 'Startup dashboard' }),
        element: page(() => import('@/pages/StartupPage')),
      },
      {
        path: 'experts',
        handle: h({ title: 'Expert dashboard' }),
        element: page(() => import('@/pages/ExpertsPage')),
      },
      { path: '*', element: <Navigate to="/government" replace /> },
    ],
  },
])
