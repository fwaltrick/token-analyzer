'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Shield,
  ExternalLink,
  Globe,
  Twitter,
  MessageCircle,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TokenDetails {
  token: {
    address: string
    name: string
    symbol: string
    description: string
    imageUrl: string
    priceUsd: number
    marketCap: number
    volume24h: number
    exchange: string
  }
  metadata: {
    logo: string
    description: string
    website?: string
    twitter?: string
    telegram?: string
    discord?: string
  }
  trading: {
    priceHistory: Array<{
      timestamp: string
      price: number
      volume: number
    }>
    priceChange24h: number
    priceChange7d: number
    allTimeHigh: number
    allTimeLow: number
    volumeChange24h: number
  }
  analytics: {
    marketCapRank: number
    liquidityScore: number
    volatilityScore: number
    tradingScore: number
    riskLevel: string
    momentum: string
  }
  insights: {
    isNewToken: boolean
    isTrending: boolean
    hasHighVolume: boolean
    priceAction: string
    recommendation: string
  }
}

interface TokenDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  tokenAddress: string | null
}

export default function TokenDetailsModal({
  isOpen,
  onClose,
  tokenAddress,
}: TokenDetailsModalProps) {
  const [details, setDetails] = useState<TokenDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && tokenAddress) {
      fetchTokenDetails()
    }
  }, [isOpen, tokenAddress])

  const fetchTokenDetails = async () => {
    if (!tokenAddress) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:3001/token-data/${tokenAddress}/details`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch token details')
      }

      setDetails(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`
    }
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`
    }
    return `$${volume.toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    const color = value >= 0 ? 'text-green-600' : 'text-red-600'
    const icon = value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
    
    return (
      <span className={`flex items-center gap-1 ${color}`}>
        {icon}
        {Math.abs(value).toFixed(2)}%
      </span>
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-600'
      case 'MEDIUM': return 'bg-yellow-600'
      case 'HIGH': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  const getMomentumColor = (momentum: string) => {
    switch (momentum) {
      case 'BULLISH': return 'bg-green-600'
      case 'BEARISH': return 'bg-red-600'
      case 'NEUTRAL': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }

  // Transform price history for chart
  const chartData = details?.trading.priceHistory.map((item, index) => ({
    time: index,
    price: item.price,
    volume: item.volume,
  })) || []

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {details?.token && (
              <>
                <img
                  src={details.metadata.logo}
                  alt={details.token.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <span className="text-2xl font-bold">{details.token.name}</span>
                  <span className="text-lg text-muted-foreground ml-2">{details.token.symbol}</span>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading token details...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            <p>Error loading token details: {error}</p>
            <Button onClick={fetchTokenDetails} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {details && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Price & Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Price</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(details.token.priceUsd)}</div>
                    <p className="text-xs text-muted-foreground">
                      24h: {formatPercentage(details.trading.priceChange24h)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatVolume(details.token.volume24h)}</div>
                    <p className="text-xs text-muted-foreground">
                      Change: {formatPercentage(details.trading.volumeChange24h)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Market Cap</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatVolume(details.token.marketCap)}</div>
                    <p className="text-xs text-muted-foreground">
                      Rank: #{details.analytics.marketCapRank}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getRiskColor(details.analytics.riskLevel)}>
                      Risk: {details.analytics.riskLevel}
                    </Badge>
                    <Badge className={getMomentumColor(details.analytics.momentum)}>
                      {details.analytics.momentum}
                    </Badge>
                    <Badge variant="outline">{details.insights.priceAction}</Badge>
                    <Badge variant="secondary">{details.insights.recommendation}</Badge>
                    {details.insights.isTrending && (
                      <Badge className="bg-orange-600">🔥 TRENDING</Badge>
                    )}
                    {details.insights.isNewToken && (
                      <Badge className="bg-blue-600">🆕 NEW</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trading" className="space-y-4">
              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Chart (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          tickFormatter={(value) => `${value}h`}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                        />
                        <Tooltip 
                          labelFormatter={(label) => `${label} hours ago`}
                          formatter={(value: number) => [formatPrice(value), 'Price']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Trading Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Price Ranges</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>All Time High:</span>
                      <span className="font-bold text-green-600">
                        {formatPrice(details.trading.allTimeHigh)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>All Time Low:</span>
                      <span className="font-bold text-red-600">
                        {formatPrice(details.trading.allTimeLow)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>24h Change:</span>
                      {formatPercentage(details.trading.priceChange24h)}
                    </div>
                    <div className="flex justify-between">
                      <span>7d Change:</span>
                      {formatPercentage(details.trading.priceChange7d)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Exchange Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Primary Exchange:</span>
                      <span className="font-bold">{details.token.exchange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trading Score:</span>
                      <span className="font-bold">{details.analytics.tradingScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Liquidity Score:</span>
                      <span className="font-bold">{details.analytics.liquidityScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volatility:</span>
                      <span className="font-bold">{details.analytics.volatilityScore}/100</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Overall Risk</span>
                          <Badge className={getRiskColor(details.analytics.riskLevel)}>
                            {details.analytics.riskLevel}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Liquidity</span>
                          <span className="text-sm font-medium">{details.analytics.liquidityScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${details.analytics.liquidityScore}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Trading Activity</span>
                          <span className="text-sm font-medium">{details.analytics.tradingScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${details.analytics.tradingScore}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Volatility</span>
                          <span className="text-sm font-medium">{details.analytics.volatilityScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full" 
                            style={{ width: `${details.analytics.volatilityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Market Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          #{details.analytics.marketCapRank}
                        </div>
                        <p className="text-sm text-muted-foreground">Market Cap Rank</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {details.insights.hasHighVolume ? '✅' : '❌'}
                          </div>
                          <p className="text-xs">High Volume</p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {details.insights.isTrending ? '🔥' : '📊'}
                          </div>
                          <p className="text-xs">Trending</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Badge 
                          className="w-full justify-center text-center"
                          variant={details.insights.recommendation === 'STRONG BUY' ? 'default' : 'secondary'}
                        >
                          {details.insights.recommendation}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="about" className="space-y-4">
              {/* Token Information */}
              <Card>
                <CardHeader>
                  <CardTitle>About {details.token.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {details.metadata.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Contract Address:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {details.token.address.slice(0, 8)}...{details.token.address.slice(-8)}
                      </code>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Links</h4>
                    <div className="flex gap-2 flex-wrap">
                      {details.metadata.website && (
                        <Button variant="outline" size="sm" className="gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {details.metadata.twitter && (
                        <Button variant="outline" size="sm" className="gap-2">
                          <Twitter className="h-4 w-4" />
                          Twitter
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {details.metadata.telegram && (
                        <Button variant="outline" size="sm" className="gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Telegram
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}