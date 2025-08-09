import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Home, Gamepad2 } from 'lucide-react'

type NavLink = {
  to: string
  label: string
  icon?: React.ReactNode
}

const navLinks: NavLink[] = [
  { to: '/app/home', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { to: '/app/games', label: 'Games', icon: <Gamepad2 className="h-4 w-4" /> },
]

const BaseLayout = () => {
  const { user } = useAuth() || { user: null }
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:flex-col w-64 fixed inset-y-0 border-r bg-background h-full">
        {/* Header - fixed height */}
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 shrink-0">
          <span className="font-semibold">BASKETBO-LISTA</span>
        </div>

        {/* Navigation - flexible height with scroll */}
        <div className="flex-1 overflow-y-auto">
          <nav className="grid gap-1 px-2 py-2">
            {navLinks.map((link: NavLink) => (
              <Button
                key={link.to}
                asChild
                variant="ghost"
                className={cn(
                  'justify-start h-9 px-2 py-2 text-sm',
                  location.pathname === link.to && 'bg-accent'
                )}
              >
                <Link to={link.to}>
                  {link.icon && <span className="mr-2">{link.icon}</span>}
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        {/* User profile - fixed height */}
        <div className="border-t p-4 shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              {user?.displayName?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{user?.displayName || user?.email || 'User'}</p>
              {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        <span className="text-2xl">☰</span>
      </button>

      {/* Mobile sidebar */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-background">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
              <span className="font-semibold">BASKETBO-LISTA</span>
              <button onClick={() => setOpen(false)} className="p-2">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className="grid gap-1 px-2 py-2">
                {navLinks.map((link: NavLink) => (
                  <Button
                    key={link.to}
                    asChild
                    variant="ghost"
                    className={cn(
                      'justify-start h-9 px-2 py-2 text-sm',
                      location.pathname === link.to && 'bg-accent'
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <Link to={link.to}>
                      {link.icon && <span className="mr-2">{link.icon}</span>}
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </div>
            <div className="border-t p-4 shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">
                    {user?.displayName || user?.email || 'User'}
                  </p>
                  {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default BaseLayout
