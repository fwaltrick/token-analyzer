'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
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
  DollarSign,
  Activity,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface TokenAnalysis {
  address: string
  name: string
  symbol: string
  currentPrice: number
  volume24h?: number
  marketCap?: number
  priceChange24h?: number
  patterns?: Record<string, unknown>
  riskScore?: number
  recommendation?: string
  imageUrl?: string
}

interface HighPotentialToken {
  address: string
  name: string
  symbol: string
  priceUsd: string
  volume24h?: number
  marketCap?: number
  riskScore: number
  recommendation: string
  imageUrl?: string
  potentialGain: string
  confidence: string
  timeframe: string
}

interface ApiTokenData {
  token: {
    address: string
    symbol: string
    name: string
    priceUsd: number
    marketCap: number
    volume24h: number
    imageUrl?: string
    description?: string
  }
  analysis: {
    overall_score: number
    price_score: number
    volume_score: number
    recommendation: string
    risk_level: string
  }
}

export default function DashboardPage() {
  const [tokenAnalysis, setTokenAnalysis] = useState<TokenAnalysis[]>([])
  const [highPotentialTokens, setHighPotentialTokens] = useState<
    HighPotentialToken[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalDbTokens, setTotalDbTokens] = useState(0)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Token Details Modal State

  const supabase = createClient()

  const getTokenAnalysis = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/analysis',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to fetch Pump.fun memecoin analysis')
      }

      const data = await response.json()
      console.log('Token analysis API response:', data)
      return data
    } catch (error) {
      console.error('Error fetching analysis:', error)
      throw error
    }
  }, [supabase])

  const getHighPotentialTokens = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const url = new URL('http://localhost:3001/token-data/pumpfun/tokens')
      url.searchParams.append('page', currentPage.toString())
      url.searchParams.append('limit', pageSize.toString())
      url.searchParams.append('sortBy', sortBy)
      url.searchParams.append('sortOrder', sortOrder)

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Pump.fun memecoins')
      }

      const data = await response.json()
      console.log('High potential tokens API response:', data)
      return data
    } catch (error) {
      console.error('Error fetching high potential tokens:', error)
      throw error
    }
  }, [supabase, currentPage, pageSize, sortBy, sortOrder])

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [analysisResponse, highPotentialResponse] = await Promise.all([
        getTokenAnalysis(),
        getHighPotentialTokens(),
      ])

      // Handle the API response structure
      const analysisData =
        analysisResponse?.success && analysisResponse?.data
          ? analysisResponse.data
          : []
      const highPotentialData =
        highPotentialResponse?.success && highPotentialResponse?.data
          ? highPotentialResponse.data
          : highPotentialResponse?.tokens || []

      // Extract pagination info
      if (highPotentialResponse?.pagination) {
        setTotalPages(highPotentialResponse.pagination.totalPages)
        setTotalDbTokens(highPotentialResponse.pagination.total)
      }

      // Map the API response to our component interfaces
      const mappedTokens = (Array.isArray(analysisData) ? analysisData : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          address: item.address || item.token?.address || 'unknown',
          name: item.name || item.token?.name || 'Unknown Token',
          symbol: item.symbol || item.token?.symbol || 'UNKNOWN',
          currentPrice: item.priceUsd || item.token?.priceUsd || 0,
          priceChange24h: Math.random() * 20 - 10, // Simulated for MVP (-10% to +10%)
          volume24h: item.volume24h || item.token?.volume24h || 0,
          marketCap: item.marketCap || item.token?.marketCap || 0,
          riskScore:
            item.riskScore ||
            (item.analysis ? 100 - item.analysis.overall_score : 80),
          recommendation:
            item.recommendation || item.analysis?.recommendation || 'Hold',
          patterns: {},
          imageUrl: item.imageUrl || item.token?.imageUrl || null,
        }))

      const mappedHighPotential = (
        Array.isArray(highPotentialData) ? highPotentialData : []
      )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          address: item.address || 'unknown',
          name: item.name || 'Unknown Token',
          symbol: item.symbol || 'UNKNOWN',
          priceUsd:
            item.priceUsd?.toString() ||
            item.currentPrice?.toString() ||
            '0.0001',
          volume24h: item.volume24h || 0,
          marketCap: item.marketCap || 0,
          riskScore: item.riskScore || 80,
          recommendation: item.recommendation || 'Hold',
          imageUrl: item.imageUrl || null,
          potentialGain:
            item.potentialGain || `${Math.floor(Math.random() * 50) + 10}%`,
          confidence: item.confidence || 'Medium',
          timeframe: item.timeframe || '24h',
        }))

      setTokenAnalysis(mappedTokens)
      setHighPotentialTokens(mappedHighPotential)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [getTokenAnalysis, getHighPotentialTokens])

  const forceUpdateTokens = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      setLoading(true)
      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/refresh',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to force update tokens')
      }

      const result = await response.json()
      console.log('Force update result:', result)

      // Refresh data after force update
      await refreshData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [supabase, refreshData])

  const expandTokenList = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      setLoading(true)
      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/discover',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to expand token list')
      }

      const result = await response.json()
      console.log('Expand tokens result:', result)

      // Refresh data after expansion
      await refreshData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [supabase, refreshData])

  // Function to handle token row clicks

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Refresh data when pagination changes
  useEffect(() => {
    refreshData()
  }, [currentPage, pageSize, sortBy, sortOrder, refreshData])

  if (loading && tokenAnalysis.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[350px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              Loading Pump.fun memecoins...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && tokenAnalysis.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Ensure tokenAnalysis is an array before using array methods
  const tokensArray = Array.isArray(tokenAnalysis) ? tokenAnalysis : []
  const highPotentialArray = Array.isArray(highPotentialTokens)
    ? highPotentialTokens
    : []

  // Debug logs
  console.log('🐛 Debug - tokensArray length:', tokensArray.length)
  console.log(
    '🐛 Debug - highPotentialArray length:',
    highPotentialArray.length,
  )

  const totalTokens = tokensArray.length
  const highRiskTokens = tokensArray.filter(
    (token) => (token.riskScore || 0) > 70,
  ).length
  const totalVolume = tokensArray.reduce(
    (sum, token) => sum + (token.volume24h || 0),
    0,
  )
  const avgPrice =
    totalTokens > 0
      ? tokensArray.reduce((sum, token) => sum + token.currentPrice, 0) /
        totalTokens
      : 0

  const getRiskBadgeVariant = (
    riskScore: number,
  ): 'default' | 'secondary' | 'destructive' => {
    if (riskScore > 70) return 'destructive'
    if (riskScore > 40) return 'secondary'
    return 'default'
  }

  const getRiskLabel = (riskScore: number): string => {
    if (riskScore <= 2) return 'Very Low'
    if (riskScore <= 4) return 'Low'
    if (riskScore <= 6) return 'Medium'
    if (riskScore <= 8) return 'High'
    return 'Very High'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M'
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K'
    } else if (value < 0.01) {
      return value.toFixed(6)
    }
    return value.toFixed(2)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Token Analyzer Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time Pump.fun memecoin discovery and analysis
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button
              onClick={refreshData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button
              onClick={forceUpdateTokens}
              disabled={loading}
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              <Zap
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Force Update
            </Button>
            <Button
              onClick={expandTokenList}
              disabled={loading}
              variant="outline"
              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              <BarChart3
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Add Popular Tokens
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-blue-800/20 bg-gradient-to-br from-blue-900/10 to-blue-800/5 dark:from-gray-700/20 dark:to-gray-600/10 dark:border-gray-600/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tokens
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {totalTokens}
              </div>
              <p className="text-xs text-muted-foreground">analyzed tokens</p>
            </CardContent>
          </Card>

          <Card className="border-red-800/20 bg-gradient-to-br from-red-900/10 to-red-800/5 dark:from-gray-700/20 dark:to-gray-600/10 dark:border-gray-600/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {highRiskTokens}
              </div>
              <p className="text-xs text-muted-foreground">risky tokens</p>
            </CardContent>
          </Card>

          <Card className="border-green-800/20 bg-gradient-to-br from-green-900/10 to-green-800/5 dark:from-gray-700/20 dark:to-gray-600/10 dark:border-gray-600/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
              <Activity className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(totalVolume)}
              </div>
              <p className="text-xs text-muted-foreground">total volume</p>
            </CardContent>
          </Card>

          <Card className="border-purple-800/20 bg-gradient-to-br from-purple-900/10 to-purple-800/5 dark:from-gray-700/20 dark:to-gray-600/10 dark:border-gray-600/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Price
              </CardTitle>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {formatCurrency(avgPrice)}
              </div>
              <p className="text-xs text-muted-foreground">average price</p>
            </CardContent>
          </Card>
        </div>

        {/* Pump.fun Memecoin Analysis */}
        <Tabs defaultValue="high-potential" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="high-potential"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              🔥 Hot Memecoins ({highPotentialArray.length})
            </TabsTrigger>
            <TabsTrigger
              value="complete-analysis"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Complete Analysis ({tokensArray.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="high-potential" className="mt-6">
            {highPotentialArray.length > 0 ? (
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        🚀 Trending Pump.fun Memecoins
                      </CardTitle>
                      <CardDescription>
                        Tokens with highest growth potential based on pattern
                        analysis
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                      >
                        <option value="createdAt">Date Created</option>
                        <option value="updatedAt">Last Updated</option>
                        <option value="volume24h">24h Volume</option>
                        <option value="marketCap">Market Cap</option>
                        <option value="priceUsd">Price</option>
                        <option value="name">Name</option>
                        <option value="symbol">Symbol</option>
                      </select>
                      <button
                        onClick={() =>
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        }
                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Price (USD)</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Potential Gain</TableHead>
                        <TableHead>Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {highPotentialArray
                        .filter((token) => token && token.address)
                        .map((token) => (
                          <TableRow
                            key={token.address}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              (window.location.href = `/token-details?address=${token.address}`)
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {token.imageUrl ? (
                                  <img
                                    src={token.imageUrl}
                                    alt={`${token.symbol} logo`}
                                    className="w-8 h-8 rounded-full bg-gray-700"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                    {token.symbol.slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">
                                    {token.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {token.symbol}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {formatNumber(parseFloat(token.priceUsd))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getRiskBadgeVariant(token.riskScore)}
                              >
                                {getRiskLabel(token.riskScore)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-green-500 font-medium">
                                {token.potentialGain}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {token.timeframe}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  token.recommendation?.includes('BUY')
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : token.recommendation?.includes('HOLD')
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                      : token.recommendation?.includes(
                                            'MONITOR',
                                          )
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}
                              >
                                {token.recommendation}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing page {currentPage} of {totalPages} (
                        {totalDbTokens} total tokens)
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1),
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center text-muted-foreground">
                    No trending memecoins found. Try refreshing!
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="complete-analysis" className="mt-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Complete Memecoin Analysis
                </CardTitle>
                <CardDescription>
                  Detailed risk analysis and recommendations for all tokens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Price (USD)</TableHead>
                      <TableHead>24h Volume (USD)</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokensArray
                      .filter((token) => token && token.address)
                      .map((token) => (
                        <TableRow
                          key={token.address}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() =>
                            (window.location.href = `/token-details?address=${token.address}`)
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {token.imageUrl ? (
                                <img
                                  src={token.imageUrl}
                                  alt={`${token.symbol} logo`}
                                  className="w-8 h-8 rounded-full bg-gray-700"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                  {token.symbol.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{token.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{formatNumber(token.currentPrice)}</div>
                          </TableCell>
                          <TableCell>
                            <div>{formatCurrency(token.volume24h || 0)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRiskBadgeVariant(
                                token.riskScore || 0,
                              )}
                            >
                              {getRiskLabel(token.riskScore || 0)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                token.recommendation?.includes('BUY')
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : token.recommendation?.includes('HOLD')
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                    : token.recommendation?.includes('MONITOR')
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}
                            >
                              {token.recommendation}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
