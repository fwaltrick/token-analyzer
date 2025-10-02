'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TrendingUp, Flame, Clock } from 'lucide-react'

export default function TrendingPage() {
  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
              Trending Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Hot tokens with significant volume and price movements
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-red-800/20 bg-gradient-to-br from-red-900/10 to-red-800/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Trending Now
              </CardTitle>
              <Flame className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">8</div>
              <p className="text-xs text-muted-foreground">hot tokens</p>
            </CardContent>
          </Card>

          <Card className="border-green-800/20 bg-gradient-to-br from-green-900/10 to-green-800/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Volume Spike
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">+245%</div>
              <p className="text-xs text-muted-foreground">average increase</p>
            </CardContent>
          </Card>

          <Card className="border-blue-800/20 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Frame</CardTitle>
              <Clock className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">24h</div>
              <p className="text-xs text-muted-foreground">trending period</p>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              Real-time trending token discovery and analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Advanced trending algorithms and real-time data feeds are being
              implemented.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
