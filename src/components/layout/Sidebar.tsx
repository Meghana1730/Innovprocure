import { NavLink } from 'react-router-dom'

import { MAIN_NAV, type NavItem } from '@/components/layout/nav'
import { useSession } from '@/lib/auth/session'
import { dashboardTasks, startupTasks } from '@/lib/demo/selectors'
import { useDemoState } from '@/lib/demo/store'
import { cn } from '@/lib/utils'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* The mark has dark blue parts, so it sits on a white tile to stay readable. */}
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white p-1">
        <img src="/logo.png" alt="" width={28} height={28} className="size-full object-contain" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="font-semibold tracking-tight text-sidebar-primary">InnovProcure</p>
          <p className="text-[11px] text-sidebar-foreground/70">Startup procurement pathway</p>
        </div>
      )}
    </div>
  )
}

function Item({
  item,
  badge,
  onNavigate,
}: {
  item: NavItem
  badge: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-sidebar-ring',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-ring)]'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        <span className="block truncate text-[11px] opacity-70">{item.who}</span>
      </span>
      {badge > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
          {badge}
          <span className="sr-only"> {badge === 1 ? 'open step' : 'open steps'}</span>
        </span>
      )}
    </NavLink>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const state = useDemoState()
  const session = useSession()
  const open = {
    government: dashboardTasks(state, 'government').length,
    startup: startupTasks(state).length,
    experts: dashboardTasks(state, 'experts').length,
  }
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5">
        <Logo />
      </div>
      <nav aria-label="Dashboards" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {/* Each account sees its own dashboard only. */}
        {MAIN_NAV.filter((item) => item.dashboard === session?.dashboard).map((item) => (
          <Item key={item.to} item={item} onNavigate={onNavigate} badge={open[item.dashboard]} />
        ))}
      </nav>
      <p className="px-5 pb-4 text-[11px] leading-snug text-sidebar-foreground/60">
        Prototype · demo data only · not an official portal
      </p>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
      <SidebarNav />
    </aside>
  )
}
