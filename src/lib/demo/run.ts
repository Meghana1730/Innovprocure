import { toast } from 'sonner'

/**
 * Runs a demo action and shows the result as a toast: the success message when it worked,
 * the action's own error message when the step is not allowed. Returns true on success.
 */
export function run(action: () => unknown, success: string): boolean {
  try {
    action()
    toast.success(success)
    return true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Something went wrong.')
    return false
  }
}
