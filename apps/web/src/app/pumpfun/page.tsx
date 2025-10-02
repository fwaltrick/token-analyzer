'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCw,
  Shield,
  Flame,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface PumpFunToken {
  chainId: string
  dexId: string
  url: string
  pairAddress: string
  baseToken: {
    address: string
    name: string
    symbol: string
  }
  quoteToken: {
    address: string
    name: string
    symbol: string
  }
  priceNative: string
  priceUsd: string
  txns: {
    m5: { buys: number; sells: number }
    h1: { buys: number; sells: number }
    h6: { buys: number; sells: number }
    h24: { buys: number; sells: number }
  }
  volume: {
    h24: number
    h6: number
    h1: number
    m5: number
  }
  priceChange: {
    h1?: number
    h6?: number
    h24?: number
  }
  liquidity: {
    usd: number
    base: number
    quote: number
  }
  fdv: number
  marketCap: number
  pairCreatedAt: number
  info?: {
    imageUrl?: string
    websites?: Array<{ label: string; url: string }>
    socials?: Array<{ type: string; url: string }>
  }
}

interface InsiderAnalysis {
  tokenAddress: string
  isInsiderToken: boolean
  riskScore: number
  suspiciousPatterns: string[]
  whaleWallets: string[]
  concentrationRatio: number
  earlyBuyerCount: number
  averageHoldingTime: number
}

interface RealTimeToken {
  address: string
  name: string
  symbol: string
  description: string
  imageUrl: string
  createdAt: string
  initialMarketCap: number
  creator: string
  socials: {
    twitter?: string
    telegram?: string
    website?: string
  }
}

interface TokenTrade {
  tokenAddress: string
  type: 'buy' | 'sell'
  solAmount: number
  tokenAmount: number
  marketCap: number
  user: string
  timestamp: number
  signature: string
}

export default function PumpFunDashboard() {
  const [pumpFunTokens, setPumpFunTokens] = useState<PumpFunToken[]>([])
  const [highRiskTokens, setHighRiskTokens] = useState<InsiderAnalysis[]>([])
  const [realTimeTokens, setRealTimeTokens] = useState<RealTimeToken[]>([])
  const [recentTrades, setRecentTrades] = useState<TokenTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Fetch PumpSwap tokens
  const fetchPumpFunTokens = async () => {
    try {
      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/tokens?limit=20',
      )
      const data = await response.json()

      if (data.success) {
        setPumpFunTokens(data.data || [])
      } else {
        setError('Failed to fetch Pump.fun tokens')
      }
    } catch (err) {
      console.error('Error fetching PumpFun tokens:', err)
      setError('Error connecting to API')
    }
  }

  // Fetch high-risk tokens
  const fetchHighRiskTokens = async () => {
    try {
      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/high-risk',
      )
      const data = await response.json()

      if (data.success) {
        setHighRiskTokens(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching high-risk tokens:', err)
    }
  }

  // Connect WebSocket for real-time data
  const connectWebSocket = async () => {
    try {
      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/connect-websocket',
        {
          method: 'POST',
        },
      )
      const data = await response.json()

      if (data.success) {
        setWsConnected(true)
        // TODO: Connect to Socket.IO client to receive real-time updates
      }
    } catch (err) {
      console.error('Error connecting WebSocket:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchPumpFunTokens(),
        fetchHighRiskTokens(),
        connectWebSocket(),
      ])
      setLoading(false)
    }

    loadData()
  }, [])

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (numPrice < 0.000001) {
      return numPrice.toExponential(2)
    }
    return `$${numPrice.toFixed(6)}`
  }

  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`
    } else if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(1)}K`
    }
    return `$${marketCap.toFixed(0)}`
  }

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`
    }
    return `$${volume.toFixed(0)}`
  }

  const getPriceChangeColor = (change?: number): string => {
    if (!change) return 'text-muted-foreground'
    return change >= 0 ? 'text-green-500' : 'text-red-500'
  }

  const getPriceChangeIcon = (change?: number) => {
    if (!change) return null
    return change >= 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    )
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          High Risk
        </Badge>
      )
    } else if (riskScore >= 40) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Activity className="h-3 w-3" />
          Medium Risk
        </Badge>
      )
    } else {
      return (
        <Badge variant="default" className="gap-1">
          <Shield className="h-3 w-3" />
          Low Risk
        </Badge>
      )
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading Pump.fun data...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive" className="mx-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🎯 Pump.fun Token Analyzer</h1>
            <p className="text-muted-foreground">
              Real-time analysis of Pump.fun tokens with insider detection
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={wsConnected ? 'default' : 'secondary'}
              className="gap-1"
            >
              <Activity className="h-3 w-3" />
              {wsConnected ? 'Real-time Connected' : 'Offline'}
            </Badge>
            <Button onClick={fetchPumpFunTokens} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active PumpSwap Tokens
              </CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pumpFunTokens.length}</div>
              <p className="text-xs text-muted-foreground">Currently trading</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High-Risk Detected
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highRiskTokens.length}</div>
              <p className="text-xs text-muted-foreground">
                Suspicious patterns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Tokens (Real-time)
              </CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{realTimeTokens.length}</div>
              <p className="text-xs text-muted-foreground">Just launched</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Trades
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentTrades.length}</div>
              <p className="text-xs text-muted-foreground">Live activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="gap-2">
              <Activity className="h-4 w-4" />
              Active Tokens
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="realtime" className="gap-2">
              <Zap className="h-4 w-4" />
              Real-time Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Active PumpSwap Tokens</CardTitle>
                <CardDescription>
                  Live tokens trading on Pump.fun with real volume data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pumpFunTokens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active PumpSwap tokens found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>24h Change</TableHead>
                        <TableHead>24h Volume</TableHead>
                        <TableHead>Market Cap</TableHead>
                        <TableHead>24h Txns</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pumpFunTokens.map((token) => (
                        <TableRow key={token.baseToken.address}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {token.info?.imageUrl && (
                                <img
                                  src={token.info.imageUrl}
                                  alt={token.baseToken.name}
                                  className="h-8 w-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {token.baseToken.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {token.baseToken.symbol}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono">
                              {formatPrice(token.priceUsd)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className={`flex items-center gap-1 ${getPriceChangeColor(token.priceChange.h24)}`}
                            >
                              {getPriceChangeIcon(token.priceChange.h24)}
                              {token.priceChange.h24
                                ? `${token.priceChange.h24.toFixed(2)}%`
                                : '--'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatVolume(token.volume.h24)}
                          </TableCell>
                          <TableCell>
                            {formatMarketCap(token.marketCap)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-green-500">
                                {token.txns.h24.buys} buys
                              </div>
                              <div className="text-red-500">
                                {token.txns.h24.sells} sells
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  href={`/token/${token.baseToken.address}`}
                                >
                                  Analyze
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={token.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  High-Risk Token Detection
                </CardTitle>
                <CardDescription>
                  Tokens with suspicious patterns and insider activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {highRiskTokens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No high-risk tokens detected</p>
                    <p className="text-sm">All analyzed tokens appear safe</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {highRiskTokens.map((analysis) => (
                      <Card
                        key={analysis.tokenAddress}
                        className="border-red-200"
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-mono text-sm text-muted-foreground">
                                {analysis.tokenAddress}
                              </p>
                            </div>
                            {getRiskBadge(analysis.riskScore)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Risk Score
                              </p>
                              <p className="text-lg font-bold text-red-500">
                                {analysis.riskScore}/100
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Early Buyers
                              </p>
                              <p className="text-lg font-bold">
                                {analysis.earlyBuyerCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Age (hours)
                              </p>
                              <p className="text-lg font-bold">
                                {analysis.averageHoldingTime.toFixed(0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Patterns
                              </p>
                              <p className="text-lg font-bold">
                                {analysis.suspiciousPatterns.length}
                              </p>
                            </div>
                          </div>

                          {analysis.suspiciousPatterns.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">
                                Suspicious Patterns:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {analysis.suspiciousPatterns.map(
                                  (pattern, index) => (
                                    <Badge
                                      key={index}
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      {pattern}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  Real-time Token Feed
                </CardTitle>
                <CardDescription>
                  Live tokens being created on Pump.fun
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Real-time feed implementation in progress</p>
                  <p className="text-sm">
                    WebSocket connection:{' '}
                    {wsConnected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
