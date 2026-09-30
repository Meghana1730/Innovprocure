import { ArrowLeftRight, LogOut, Menu, RotateCcw, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { SidebarNav } from '@/components/layout/Sidebar'
import { ConfirmDialog } from '@/components/overlays'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DASHBOARD_NAMES, DEMO_ACCOUNTS } from '@/lib/auth/accounts'
import { signOut, switchAccount, useSession } from '@/lib/auth/session'
import { resetDemo } from '@/lib/demo/store'

/** Puts the demo data back to its starting point. */
function ResetDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <RotateCcw aria-hidden /> <span className="hidden sm:inline">Reset demo</span>
        <span className="sr-only sm:hidden">Reset demo</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reset the demo data?"
        description="Everything you changed in this browser goes back to the starting point."
        confirmLabel="Reset"
        destructive
        onConfirm={() => {
          resetDemo()
          setOpen(false)
          toast.success('Demo data reset')
        }}
      />
    </>
  )
}

/** Who is signed in, a one-click switch to the other demo accounts, and sign out. */
function AccountMenu() {
  const session = useSession()
  const navigate = useNavigate()
  if (!session) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="max-w-56 shrink-0 gap-2 px-2"
          aria-label={`Account: ${session.name}`}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <UserRound className="size-4" aria-hidden />
          </span>
          <span className="hidden min-w-0 truncate md:inline">{session.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={8}
        className="w-72 max-w-[calc(100vw-1rem)]"
      >
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate font-medium">{session.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{session.email}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {DASHBOARD_NAMES[session.dashboard]}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Switch demo account
        </DropdownMenuLabel>
        {DEMO_ACCOUNTS.filter((account) => account.dashboard !== session.dashboard).map(
          (account) => (
            <DropdownMenuItem
              key={account.dashboard}
              onSelect={() => {
                switchAccount(account.dashboard)
                navigate(account.home)
                toast.success(`Signed in as ${account.name}`, { id: 'account-switch' })
              }}
            >
              <ArrowLeftRight aria-hidden /> {DASHBOARD_NAMES[account.dashboard]}
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut()
            navigate('/login')
          }}
        >
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopBar({ title }: { title: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu aria-hidden />
        </Button>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            className="w-64 gap-0 overflow-y-auto border-0 bg-sidebar p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-foreground" aria-hidden>
          {title}
        </p>
        <ResetDemo />
        <AccountMenu />
      </div>
    </header>
  )
}
