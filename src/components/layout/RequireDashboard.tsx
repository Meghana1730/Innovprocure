// Shows a dashboard only to its own account.
//
// Demo shortcuts, because one presenter plays every side: a link inside the app that leads to
// another side's dashboard switches to that account in the same click; an address typed or
// reloaded shows whose dashboard it is and offers the switch. In production the other person
// would sign in with their own account.
import { ArrowLeftRight, Lock } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, NavigationType, useNavigationType } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DASHBOARD_NAMES, accountFor } from '@/lib/auth/accounts'
import { switchAccount, useSession } from '@/lib/auth/session'
import type { Dashboard } from '@/lib/demo/selectors'

/** After a switch the keyboard focus moves to the page content instead of being lost. */
function focusMain() {
  requestAnimationFrame(() => document.getElementById('main')?.focus())
}

export function RequireDashboard({
  dashboard,
  children,
}: {
  dashboard: Dashboard
  children: ReactNode
}) {
  const session = useSession()
  const cameByLink = useNavigationType() === NavigationType.Push
  const owner = accountFor(dashboard)
  const other = session !== null && session.dashboard !== dashboard
  const follow = other && cameByLink

  useEffect(() => {
    if (!follow) return
    switchAccount(dashboard)
    // The id keeps it to one toast if the effect runs twice.
    toast.success(`Signed in as ${owner.name}`, { id: 'account-switch' })
    focusMain()
  }, [follow, dashboard, owner.name])

  if (!session || !other) return <>{children}</>
  if (follow) return null
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
            toast.success(`Signed in as ${owner.name}`, { id: 'account-switch' })
            focusMain()
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
