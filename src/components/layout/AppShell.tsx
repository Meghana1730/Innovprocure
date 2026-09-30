import { FlaskConical } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { APP_NAME, useDocumentTitle, useRouteMeta } from '@/components/layout/route-meta'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useSession } from '@/lib/auth/session'

function DemoStrip() {
  return (
    <div
      data-print-hide
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-demo-soft px-4 py-1.5 text-xs text-demo lg:px-8"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <FlaskConical className="size-3.5" aria-hidden /> Prototype with demo data
      </span>
      <span>
        Departments, startups, people, amounts and results are made up. Changes are saved in this
        browser only.
      </span>
    </div>
  )
}

export function AppShell() {
  const { title } = useRouteMeta()
  useDocumentTitle(title)
  const session = useSession()
  const location = useLocation()
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar title={title ?? APP_NAME} />
        <DemoStrip />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-[1600px] px-4 py-6 outline-none lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
