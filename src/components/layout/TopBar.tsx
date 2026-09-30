import { Menu, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SidebarNav } from '@/components/layout/Sidebar'
import { ConfirmDialog } from '@/components/overlays'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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
      </div>
    </header>
  )
}
