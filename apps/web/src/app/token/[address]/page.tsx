'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import CandlestickChart from '@/components/CandlestickChart'

interface TokenDetails {
  address: string
  name: string
  symbol: string
  priceUsd: number
  marketCap: number
  volume24h: number
  imageUrl?: string
  description?: string
  trading?: {
    priceHistory: Array<{ timestamp: string; price: number; volume: number }>
    priceChange24h: number
    priceChange7d: number
  }
  analytics?: {
    riskLevel: string
    liquidityScore: number
    volatilityScore: number
    tradingScore: number
  }
  insights?: {
    recommendation: string
  }
}

export default function TokenPage() {
  const params = useParams()
  const [tokenData, setTokenData] = useState<TokenDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!params.address) return

      try {
        setLoading(true)
        const response = await fetch(
          `http://localhost:3001/token-data/${params.address}/details`,
        )

        if (!response.ok) {
          throw new Error('Failed to fetch token details')
        }

        const data = await response.json()
        setTokenData(data.token)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTokenDetails()
  }, [params.address])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading token details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !tokenData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-muted-foreground mb-6">
            {error || 'Token not found'}
          </p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M'
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K'
    }
    return value.toFixed(6)
  }

  return (
    <DashboardLayout>
      <div>
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4">
            {tokenData.imageUrl ? (
              <img
                src={tokenData.imageUrl}
                alt={`${tokenData.symbol} logo`}
                className="w-16 h-16 rounded-full bg-gray-700"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {tokenData.symbol.slice(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {tokenData.name}
              </h1>
              <p className="text-muted-foreground text-lg">
                {tokenData.symbol}
              </p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button variant="outline" asChild>
              <a
                href={`https://dexscreener.com/solana/${tokenData.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on DexScreener
              </a>
            </Button>
          </div>
        </div>

        {/* Price & Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Price
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(tokenData.priceUsd)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Cap</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(tokenData.marketCap)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(tokenData.volume24h)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tokenData.analytics?.riskLevel || 'N/A'}
              </div>
              <Badge
                variant={
                  tokenData.analytics?.riskLevel === 'LOW'
                    ? 'default'
                    : tokenData.analytics?.riskLevel === 'MEDIUM'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {tokenData.analytics?.riskLevel === 'LOW'
                  ? 'Low Risk'
                  : tokenData.analytics?.riskLevel === 'MEDIUM'
                    ? 'Medium Risk'
                    : 'High Risk'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>24H Price Chart</CardTitle>
                  <CardDescription>
                    Real-time price movements with trend indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 p-2 bg-muted rounded text-xs">
                      <p>
                        Debug: Price History Length:{' '}
                        {tokenData.trading?.priceHistory?.length || 0}
                      </p>
                      <p>
                        Debug: Has Trading Data:{' '}
                        {tokenData.trading ? 'Yes' : 'No'}
                      </p>
                      {(tokenData.trading?.priceHistory?.length || 0) === 0 && (
                        <p className="text-yellow-600">
                          Using simulated data for chart
                        </p>
                      )}
                    </div>
                  )}

                  <CandlestickChart
                    data={[]} // Will use simulated data since priceHistory doesn't have OHLC format
                    title={`${tokenData.symbol} Candlestick Chart`}
                    height={400}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendation</CardTitle>
                    <CardDescription>
                      AI-powered trading recommendation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <Badge className="text-lg px-4 py-2 mb-4">
                        {tokenData.insights?.recommendation || 'N/A'}
                      </Badge>
                      <p className="text-muted-foreground">
                        Trading Score: {tokenData.analytics?.tradingScore || 0}
                        /100
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Key metrics at a glance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {tokenData.address.slice(0, 8)}...
                        {tokenData.address.slice(-8)}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">24h Change:</span>
                      <span
                        className={
                          (tokenData.trading?.priceChange24h || 0) >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {(tokenData.trading?.priceChange24h || 0) >= 0
                          ? '+'
                          : ''}
                        {(tokenData.trading?.priceChange24h || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">7d Change:</span>
                      <span
                        className={
                          (tokenData.trading?.priceChange7d || 0) >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {(tokenData.trading?.priceChange7d || 0) >= 0
                          ? '+'
                          : ''}
                        {(tokenData.trading?.priceChange7d || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Liquidity Score:
                      </span>
                      <span>
                        {tokenData.analytics?.liquidityScore || 0}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volatility:</span>
                      <span>
                        {tokenData.analytics?.volatilityScore || 0}/100
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Analysis</CardTitle>
                    <CardDescription>
                      Comprehensive risk assessment metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Risk Level</span>
                        <Badge
                          variant={
                            tokenData.analytics?.riskLevel === 'LOW'
                              ? 'default'
                              : tokenData.analytics?.riskLevel === 'MEDIUM'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {tokenData.analytics?.riskLevel || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Liquidity Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${tokenData.analytics?.liquidityScore || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-mono">
                            {tokenData.analytics?.liquidityScore || 0}/100
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Volatility Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{
                                width: `${tokenData.analytics?.volatilityScore || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-mono">
                            {tokenData.analytics?.volatilityScore || 0}/100
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Trading Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${tokenData.analytics?.tradingScore || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-mono">
                            {tokenData.analytics?.tradingScore || 0}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Historical performance indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          24h Performance
                        </span>
                        <span
                          className={
                            (tokenData.trading?.priceChange24h || 0) >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {(tokenData.trading?.priceChange24h || 0) >= 0
                            ? '📈'
                            : '📉'}
                          {(tokenData.trading?.priceChange24h || 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          7d Performance
                        </span>
                        <span
                          className={
                            (tokenData.trading?.priceChange7d || 0) >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {(tokenData.trading?.priceChange7d || 0) >= 0
                            ? '📈'
                            : '📉'}
                          {(tokenData.trading?.priceChange7d || 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Market Cap
                        </span>
                        <span className="font-mono">
                          {formatCurrency(tokenData.marketCap)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          24h Volume
                        </span>
                        <span className="font-mono">
                          {formatCurrency(tokenData.volume24h)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Volume Chart */}
              {tokenData.trading?.priceHistory &&
                tokenData.trading.priceHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Volume Analysis</CardTitle>
                      <CardDescription>
                        24-hour trading volume patterns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CandlestickChart
                        data={[]} // Using simulated volume candlestick data
                        title="Volume Distribution (Candlestick)"
                        height={300}
                      />
                    </CardContent>
                  </Card>
                )}
            </div>
          </TabsContent>

          <TabsContent value="trading" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Trading Information</CardTitle>
                <CardDescription>
                  Where and how to trade this token
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Trading integration features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About {tokenData.name}</CardTitle>
                <CardDescription>
                  Token information and description
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tokenData.description ? (
                  <p className="text-muted-foreground leading-relaxed">
                    {tokenData.description}
                  </p>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No description available for this token</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
