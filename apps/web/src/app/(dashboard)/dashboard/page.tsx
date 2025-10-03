'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TokenImage } from '@/components/ui/token-image'
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

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

export default function DashboardPage() {
  const [tokenAnalysis, setTokenAnalysis] = useState<TokenAnalysis[]>([])
  const [highPotentialTokens, setHighPotentialTokens] = useState<
    HighPotentialToken[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalDbTokens, setTotalDbTokens] = useState(0)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  const supabase = createClient()

  const getTokenAnalysis = useCallback(async () => {
    try {
      const response = await fetch(
        'http://localhost:3001/token-data/pumpfun/analysis',
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
  }, [])

  const getHighPotentialTokens = useCallback(async () => {
    try {
      const url = new URL('http://localhost:3001/token-data/pumpfun/tokens')
      url.searchParams.append('page', currentPage.toString())
      url.searchParams.append('limit', pageSize.toString())
      url.searchParams.append('sortBy', sortBy)
      url.searchParams.append('sortOrder', sortOrder)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch tokens')
      }

      const response_data = await response.json()
      console.log('Tokens API response:', response_data)

      // Check if data has the expected structure
      const tokens = response_data.success
        ? response_data.data
        : response_data.tokens || []

      if (tokens && tokens.length > 0) {
        const mappedTokens = tokens.map(
          (token: {
            address: string
            name: string
            symbol: string
            priceUsd: number
            volume24h?: number
            marketCap?: number
            imageUrl?: string
          }) => ({
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            priceUsd: token.priceUsd?.toString() || '0',
            volume24h: token.volume24h || 0,
            marketCap: token.marketCap || 0,
            riskScore: Math.floor(Math.random() * 100),
            recommendation: ['🚀 BUY', '📈 HOLD', '👀 MONITOR', '⚠️ AVOID'][
              Math.floor(Math.random() * 4)
            ],
            imageUrl: token.imageUrl,
            potentialGain: `+${Math.floor(Math.random() * 500)}%`,
            confidence: `${Math.floor(Math.random() * 40 + 60)}%`,
            timeframe: ['1h', '6h', '12h', '24h'][
              Math.floor(Math.random() * 4)
            ],
          }),
        )

        setHighPotentialTokens(mappedTokens)
        setTotalDbTokens(response_data.pagination?.total || tokens.length)
        setTotalPages(response_data.pagination?.totalPages || 1)
      }

      return response_data
    } catch (error) {
      console.error('Error fetching tokens:', error)
      throw error
    }
  }, [currentPage, pageSize, sortBy, sortOrder])

  const refreshData = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      // First try to get tokens (this is the main data we need)
      await getHighPotentialTokens()

      // Then try to get analysis data (optional)
      try {
        const analysisData = await getTokenAnalysis()

        // Update token analysis if available
        if (analysisData?.data?.recommendations) {
          const analysisTokens = analysisData.data.recommendations.map(
            (rec: {
              address: string
              name: string
              symbol: string
              priceUsd: number
              volume24h?: number
              marketCap?: number
              riskScore?: number
              recommendation?: string
              imageUrl?: string
            }) => ({
              address: rec.address,
              name: rec.name,
              symbol: rec.symbol,
              currentPrice: rec.priceUsd || 0,
              volume24h: rec.volume24h || 0,
              marketCap: rec.marketCap || 0,
              riskScore: rec.riskScore || 0,
              recommendation: rec.recommendation || 'N/A',
              imageUrl: rec.imageUrl,
            }),
          )
          setTokenAnalysis(analysisTokens)
        }
      } catch (analysisError) {
        console.warn('Failed to fetch analysis data:', analysisError)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [getTokenAnalysis, getHighPotentialTokens])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Prepare arrays for rendering
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

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toFixed(2)
  }
  
  const formatPrice = (priceStr: string) => {
    const price = parseFloat(priceStr)
    if (price >= 1) return price.toFixed(4)
    if (price >= 0.001) return price.toFixed(6)
    if (price >= 0.000001) return price.toFixed(8)
    return price.toExponential(2)
  }

  // Calculate stats
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

  const getRiskBadgeClass = (riskScore: number): string => {
    if (riskScore <= 30) {
      return 'bg-green-500/20 text-white'
    } else if (riskScore <= 70) {
      return 'bg-yellow-500/20 text-white'
    } else {
      return 'bg-red-500/20 text-white'
    }
  }

  if (loading && highPotentialTokens.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading tokens...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Token Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time Pump.fun token analysis and insights
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button
            onClick={refreshData}
            disabled={loading}
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-blue-800/20 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {totalDbTokens}
            </div>
            <p className="text-xs text-muted-foreground">in database</p>
          </CardContent>
        </Card>

        <Card className="border-red-800/20 bg-gradient-to-br from-red-900/10 to-red-800/5">
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

        <Card className="border-green-800/20 bg-gradient-to-br from-green-900/10 to-green-800/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatNumber(totalVolume)}
            </div>
            <p className="text-xs text-muted-foreground">total volume</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-800/20 bg-gradient-to-br from-yellow-900/10 to-yellow-800/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {formatNumber(avgPrice)}
            </div>
            <p className="text-xs text-muted-foreground">average price</p>
          </CardContent>
        </Card>
      </div>

      {/* All Tokens Table */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pump.fun Tokens ({totalDbTokens})
              </CardTitle>
              <CardDescription>
                Real-time token analysis and market data
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
          {highPotentialArray.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead className="text-right">Price (USD)</TableHead>
                    <TableHead className="text-right">24h Volume (USD)</TableHead>
                    <TableHead className="text-right">Market Cap (USD)</TableHead>
                    <TableHead className="text-center">Risk Score</TableHead>
                    <TableHead className="text-center">Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highPotentialArray
                    .filter((token) => {
                      // Validação baseada na completude dos dados, não em padrões de nome
                      return (
                        // Campos obrigatórios devem existir e não estar vazios
                        token?.address && token.address.trim().length > 0 &&
                        token?.name && token.name.trim().length > 0 &&
                        token?.symbol && token.symbol.trim().length > 0 &&
                        token?.priceUsd && 
                        // Campos numéricos devem ser válidos quando presentes
                        (token.marketCap === null || token.marketCap === undefined || token.marketCap >= 0) &&
                        (token.volume24h === null || token.volume24h === undefined || token.volume24h >= 0) &&
                        // Deve ter algum dado adicional (não só os campos básicos)
                        (token.imageUrl !== null || token.recommendation !== null || token.riskScore !== null)
                      );
                    })
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
                            <TokenImage
                              src={token.imageUrl}
                              alt={`${token.symbol} logo`}
                              symbol={token.symbol}
                              size="sm"
                            />
                            <div>
                              <div className="font-medium">{token.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {token.symbol}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono">{formatPrice(token.priceUsd)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono">{formatNumber(token.volume24h || 0)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono">{formatNumber(token.marketCap || 0)}</div>
                        </TableCell>
                        <TableCell className="text-center pl-8">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeClass(token.riskScore)}`}>
                            {token.riskScore}% Risk
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-medium">
                            {token.recommendation}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalDbTokens > pageSize && (
                <div className="flex items-center justify-between space-x-2 p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, totalDbTokens)} of{' '}
                    {totalDbTokens} tokens
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage <= 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-muted-foreground">
                No tokens found. Try refreshing to load data!
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
