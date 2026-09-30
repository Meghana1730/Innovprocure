// Who is signed in. Kept in this browser (localStorage); there is no server yet, so this is
// a demo sign-in that decides which dashboard is shown, not real access control.

import { useSyncExternalStore } from 'react'

import { DEMO_ACCOUNTS, type Account } from '@/lib/auth/accounts'
import type { Dashboard } from '@/lib/demo/selectors'

const STORAGE_KEY = 'innovprocure.session.v1'

function load(): Account | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as { account?: string }
    return DEMO_ACCOUNTS.find((a) => a.dashboard === saved.account) ?? null
  } catch {
    return null
  }
}

let current: Account | null = load()
const listeners = new Set<() => void>()

function commit(account: Account | null) {
  current = account
  try {
    if (account) localStorage.setItem(STORAGE_KEY, JSON.stringify({ account: account.dashboard }))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the session lasts until the page is reloaded.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The signed-in account, or null. The component re-renders on sign-in and sign-out. */
export function useSession(): Account | null {
  return useSyncExternalStore(subscribe, () => current)
}

/** Signs in with an email and password. Throws an Error with a plain message when wrong. */
export function signIn(email: string, password: string): Account {
  const account = DEMO_ACCOUNTS.find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  )
  if (!account) throw new Error('The email or password is not correct.')
  commit(account)
  return account
}

/** Demo shortcut: switch to the account of another dashboard without typing its password. */
export function switchAccount(dashboard: Dashboard): Account {
  const account = DEMO_ACCOUNTS.find((a) => a.dashboard === dashboard) ?? DEMO_ACCOUNTS[0]
  commit(account)
  return account
}

export function signOut() {
  commit(null)
}
