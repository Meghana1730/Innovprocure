// Sign-in screen (shown without the app shell). One demo account per dashboard.
import { ArrowRight, ClipboardCheck, FlaskConical, Landmark, Rocket } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useDocumentTitle } from '@/components/layout/route-meta'
import { Logo } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DASHBOARD_NAMES, DEMO_ACCOUNTS, type Account } from '@/lib/auth/accounts'
import { signIn, useSession } from '@/lib/auth/session'
import type { Dashboard } from '@/lib/demo/selectors'
import { STAGE_INFO } from '@/lib/domain/policy'
import { STAGES } from '@/lib/domain/types'

const ICONS: Record<Dashboard, typeof Landmark> = {
  government: Landmark,
  startup: Rocket,
  experts: ClipboardCheck,
}

/** Where to go after sign-in: the page that was asked for if it is this account's dashboard. */
function destination(account: Account, from: string | undefined): string {
  return from && from.startsWith(account.home) ? from : account.home
}

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to={destination(session, from)} replace />

  function enter(address: string, secret: string) {
    try {
      const account = signIn(address, secret)
      toast.success(`Signed in as ${account.name}`)
      navigate(destination(account, from), { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.')
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter the email and the password.')
      return
    }
    enter(email, password)
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="flex min-w-0 flex-col justify-between gap-8 bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 lg:px-12 lg:py-12">
        <Logo />
        <div className="max-w-xl space-y-5">
          <p className="text-xs font-semibold tracking-wider text-sidebar-foreground/70 uppercase">
            Startup-friendly public procurement
          </p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-sidebar-primary xl:text-4xl">
            One pathway from a department&apos;s problem to a tested, paid and scaled startup
            solution
          </h1>
          {/* Phones skip the stage list so the sign-in form comes first. */}
          <ol className="hidden gap-x-6 gap-y-1.5 text-sm sm:grid sm:grid-cols-2">
            {STAGES.map((stage, index) => (
              <li key={stage} className="flex items-baseline gap-2">
                <span className="tabular w-5 shrink-0 text-right text-sidebar-foreground/60">
                  {index + 1}
                </span>
                <span>{STAGE_INFO[stage].label}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="flex max-w-xl gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-4 py-3 text-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Prototype with demo data. Departments, startups, people, amounts and results are made
            up. This is not an official portal.
          </span>
        </p>
      </aside>

      <main className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Each account opens its own dashboard. Use one of the demo accounts below.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Sign in <ArrowRight aria-hidden />
            </Button>
          </form>

          <section aria-labelledby="demo-accounts" className="space-y-3">
            <div className="space-y-1">
              <h3 id="demo-accounts" className="text-sm font-semibold">
                Demo accounts
              </h3>
              <p className="text-xs text-muted-foreground">
                These are demo credentials, open to everyone. The prototype has no server, so do not
                type a real password here.
              </p>
            </div>
            <ul className="space-y-3">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = ICONS[account.dashboard]
                return (
                  <li
                    key={account.dashboard}
                    className="min-w-0 rounded-xl border bg-card p-4 shadow-xs"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                        <Icon className="size-4.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">{DASHBOARD_NAMES[account.dashboard]}</p>
                        <p className="text-xs text-muted-foreground">{account.can}</p>
                        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 pt-1 text-xs">
                          <dt className="text-muted-foreground">Email</dt>
                          <dd className="font-mono break-all">{account.email}</dd>
                          <dt className="text-muted-foreground">Password</dt>
                          <dd className="font-mono break-all">{account.password}</dd>
                        </dl>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => enter(account.email, account.password)}
                      >
                        Sign in to the {DASHBOARD_NAMES[account.dashboard]}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEmail(account.email)
                          setPassword(account.password)
                          setError(null)
                        }}
                      >
                        Fill the form
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
