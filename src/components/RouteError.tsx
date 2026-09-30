// Shown by the router when a page fails to render or its code cannot be loaded.
import { House, RefreshCw, TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import { Button } from '@/components/ui/button'

function technicalDetail(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim()
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

export function RouteError() {
  const error = useRouteError()
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        role="alert"
        className="animate-in-up w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page could not be shown. Reloading usually fixes it, for example after the site was
            updated.
          </p>
        </div>
        {import.meta.env.DEV && (
          <p className="rounded-lg bg-muted px-3 py-2 text-left font-mono text-xs break-words text-muted-foreground">
            {technicalDetail(error)}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden /> Reload
          </Button>
          <Button variant="outline" asChild>
            <Link to="/government" reloadDocument>
              <House aria-hidden /> Go to the Government dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
