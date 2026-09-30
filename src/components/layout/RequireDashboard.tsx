// Shows a dashboard only to its own account. Any other account sees whose dashboard it is
// and a one-click switch (a demo shortcut: in production the other person would sign in).
import { ArrowLeftRight, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DASHBOARD_NAMES, accountFor } from '@/lib/auth/accounts'
import { switchAccount, useSession } from '@/lib/auth/session'
import type { Dashboard } from '@/lib/demo/selectors'

export function RequireDashboard({
  dashboard,
  children,
}: {
  dashboard: Dashboard
  children: ReactNode
}) {
  const session = useSession()
  if (!session || session.dashboard === dashboard) return <>{children}</>
  const owner = accountFor(dashboard)
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border bg-card p-6 text-center shadow-xs sm:p-8">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-primary">
        <Lock className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">
          This is the {DASHBOARD_NAMES[dashboard]}
        </h1>
        <p className="text-sm text-muted-foreground">
          You are signed in as {session.name}. The {DASHBOARD_NAMES[dashboard]} belongs to the
          account {owner.email}. For the demo you can switch to it in one click.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            switchAccount(dashboard)
            toast.success(`Signed in as ${owner.name}`)
          }}
        >
          <ArrowLeftRight aria-hidden /> Switch to {owner.name}
        </Button>
        <Button variant="outline" asChild>
          <Link to={session.home}>Back to my dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
