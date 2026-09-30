import { ClipboardCheck, Landmark, Rocket, type LucideIcon } from 'lucide-react'

import type { Dashboard } from '@/lib/demo/selectors'

export type NavItem = {
  to: string
  label: string
  who: string
  icon: LucideIcon
  dashboard: Dashboard
}

/** The three dashboards: one per side of the mechanism. */
export const MAIN_NAV: NavItem[] = [
  {
    to: '/government',
    label: 'Government',
    who: 'Officers and finance',
    icon: Landmark,
    dashboard: 'government',
  },
  {
    to: '/startup',
    label: 'Startup',
    who: 'Apply, deliver, get paid',
    icon: Rocket,
    dashboard: 'startup',
  },
  {
    to: '/experts',
    label: 'Experts',
    who: 'Evaluators and validators',
    icon: ClipboardCheck,
    dashboard: 'experts',
  },
]
