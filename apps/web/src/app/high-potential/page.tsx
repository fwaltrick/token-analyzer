'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Zap, TrendingUp, Target } from 'lucide-react'

export default function HighPotentialPage() {
  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              High Potential Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Tokens with exceptional growth potential and strong fundamentals
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-yellow-800/20 bg-gradient-to-br from-yellow-900/10 to-yellow-800/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Potential
              </CardTitle>
              <Zap className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">12</div>
              <p className="text-xs text-muted-foreground">identified tokens</p>
            </CardContent>
          </Card>

          <Card className="border-green-800/20 bg-gradient-to-br from-green-900/10 to-green-800/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Gain
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">+32.5%</div>
              <p className="text-xs text-muted-foreground">potential return</p>
            </CardContent>
          </Card>

          <Card className="border-blue-800/20 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <Target className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">78%</div>
              <p className="text-xs text-muted-foreground">accuracy rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Content will be moved here from dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              This page will show detailed analysis of high potential tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Advanced filtering and analysis features are being developed.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
