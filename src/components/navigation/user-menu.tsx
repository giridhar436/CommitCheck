import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, User as UserIcon, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'

export function UserMenu() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Default to Demo user if not logged in yet
  const currentUser = user ?? {
    name: 'Rahul Mehta',
    email: 'rahul@pixelforge.io',
    organization: 'PixelForge Studios',
    role: 'owner' as const,
  }

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    logout()
    toast.info('Signed out of CommitCheck')
    navigate('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
          aria-label="User account menu"
        >
          <Avatar className="h-8 w-8 border border-border/80">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1">
        <DropdownMenuLabel className="p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-semibold leading-none text-foreground">
              {currentUser.name}
            </p>
            <p className="text-[11px] leading-none text-muted-foreground truncate">
              {currentUser.email}
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{currentUser.organization ?? 'PixelForge Studios'}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="text-xs cursor-pointer"
        >
          <UserIcon className="mr-2 h-3.5 w-3.5" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="text-xs cursor-pointer"
        >
          <Settings className="mr-2 h-3.5 w-3.5" />
          Settings & Theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-xs text-red-600 dark:text-red-400 cursor-pointer"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
