'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Zap,
  TrendingUp,
  Settings,
  Menu,
  X,
  Home,
  Search,
  Bell,
  User,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      description: 'Token analysis overview',
    },
    {
      name: '🎯 Pump.fun Live',
      href: '/pumpfun',
      icon: Zap,
      description: 'Real-time Pump.fun analysis',
    },
    {
      name: 'Token Details',
      href: '/token-details',
      icon: BarChart3,
      description: 'Detailed token analysis',
    },
    {
      name: 'High Potential',
      href: '/high-potential',
      icon: TrendingUp,
      description: 'High growth tokens',
    },
    {
      name: 'Search',
      href: '/search',
      icon: Search,
      description: 'Find tokens',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      description: 'Market analytics',
    },
    {
      name: 'Alerts',
      href: '/alerts',
      icon: Bell,
      description: 'Price alerts',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      description: 'User settings',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'App preferences',
    },
  ]

  return (
    <div
      className={cn(
        'flex flex-col h-screen border-r border-border bg-background transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Token Analyzer</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  isCollapsed && 'justify-center',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="text-xs opacity-70">
                      {item.description}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">
            <p>Token Analyzer v1.0</p>
            <p>Real-time Solana data</p>
          </div>
        )}
      </div>
    </div>
  )
}
