// Demo accounts: one per dashboard.
//
// These are PUBLIC DEMO CREDENTIALS, shown on the sign-in page and in the README. They are
// not secrets and they protect nothing: the prototype has no server, and every record in it
// is demo data held in the visitor's browser. Real sign-in (hashed passwords, roles checked
// on a server) comes with the backend.

import type { Dashboard } from '@/lib/demo/selectors'

export type Account = {
  /** The dashboard this account works on; also the account id. */
  dashboard: Dashboard
  email: string
  password: string
  /** Who the presenter is when signed in. */
  name: string
  /** What this account can do, in one line. */
  can: string
  home: string
}

export const DEMO_ACCOUNTS: Account[] = [
  {
    dashboard: 'government',
    email: 'officer@innovprocure.demo',
    password: 'Govt@2026',
    name: 'Demo Government Officer',
    can: 'Publish challenges, screen and select startups, run pilots, pay milestones, decide on scale-up.',
    home: '/government',
  },
  {
    dashboard: 'startup',
    email: 'startup@innovprocure.demo',
    password: 'Startup@2026',
    name: 'Demo Startup Founder',
    can: 'See open calls, apply, deliver milestones and track payments.',
    home: '/startup',
  },
  {
    dashboard: 'experts',
    email: 'expert@innovprocure.demo',
    password: 'Expert@2026',
    name: 'Demo Independent Expert',
    can: 'Score applications against the rubric and validate pilot results.',
    home: '/experts',
  },
]

export const DASHBOARD_NAMES: Record<Dashboard, string> = {
  government: 'Government dashboard',
  startup: 'Startup dashboard',
  experts: 'Expert dashboard',
}

export function accountFor(dashboard: Dashboard): Account {
  return DEMO_ACCOUNTS.find((a) => a.dashboard === dashboard) ?? DEMO_ACCOUNTS[0]
}
