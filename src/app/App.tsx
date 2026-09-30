import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  )
}
