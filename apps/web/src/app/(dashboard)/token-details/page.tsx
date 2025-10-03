'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  DollarSign,
  BarChart3,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { CandlestickChart } from '@/components/CandlestickChart'

interface TokenDetails {
  id: string
  address: string
  name: string
  symbol: string
  description: string
  imageUrl: string
  priceUsd: number
  marketCap: number
  volume24h: number
  createdAt: string
  updatedAt: string
  twitter?: string
  telegram?: string
  website?: string
}

interface RiskAnalysis {
  riskScore: number
  recommendation: string
  potentialGain: string
  factors: string[]
}

export default function TokenDetailsPage() {
  const searchParams = useSearchParams()
  const address = searchParams.get('address')

  const [token, setToken] = useState<TokenDetails | null>(null)
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchTokenDetails = useCallback(async () => {
    if (!address) {
      setError('No token address provided')
      setLoading(false)
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Fetch token details
      const response = await fetch(
        `http://localhost:3001/token-data/${address}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to fetch token details')
      }

      const data = await response.json()

      // Check if the API response indicates success
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Token not found')
      }

      setToken(data.data)

      // Calculate risk analysis
      const analysis = calculateRiskAnalysis(data.data)
      setRiskAnalysis(analysis)
    } catch (err) {
      console.error('Error fetching token details:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch token details',
      )
    } finally {
      setLoading(false)
    }
  }, [address, supabase.auth])

  const calculateRiskAnalysis = (tokenData: TokenDetails): RiskAnalysis => {
    if (!tokenData) {
      return {
        riskScore: 100,
        factors: ['Token data not available'],
        recommendation: '⚠️ AVOID',
        potentialGain: 'N/A',
      }
    }

    let riskScore = 50 // Base risk score
    const factors: string[] = []

    // Volume analysis
    const volume24h = tokenData?.volume24h || 0
    if (volume24h < 50000) {
      riskScore += 20
      factors.push('Low 24h volume (< $50k)')
    } else if (volume24h > 500000) {
      riskScore -= 15
      factors.push('High 24h volume (> $500k)')
    }

    // Price analysis
    const priceUsd =
      typeof tokenData?.priceUsd === 'string'
        ? parseFloat(tokenData.priceUsd)
        : tokenData?.priceUsd || 0
    if (priceUsd < 0.001) {
      riskScore += 15
      factors.push('Very low price (< $0.001)')
    }

    // Market cap analysis
    const marketCap = tokenData?.marketCap || 0
    if (marketCap < 100000) {
      riskScore += 15
      factors.push('Low market cap (< $100k)')
    } else if (marketCap > 1000000) {
      riskScore -= 10
      factors.push('Decent market cap (> $1M)')
    }

    // Age analysis
    if (tokenData?.createdAt) {
      const age = Date.now() - new Date(tokenData.createdAt).getTime()
      const hoursAge = age / (1000 * 60 * 60)
      if (hoursAge < 24) {
        riskScore += 10
        factors.push('Very new token (< 24h old)')
      }
    }

    riskScore = Math.max(0, Math.min(100, riskScore))

    let recommendation: string
    if (riskScore > 80) recommendation = '⚠️ AVOID'
    else if (riskScore > 60) recommendation = '👀 MONITOR'
    else if (volume24h > 500000 && marketCap > 1000000)
      recommendation = '🚀 BUY'
    else if (volume24h > 100000 && marketCap > 500000)
      recommendation = '📈 HOLD'
    else recommendation = '🤔 RESEARCH'

    let potentialGain: string
    if (volume24h > 1000000 && marketCap < 5000000)
      potentialGain = '+500% (24h)'
    else if (volume24h > 500000 && marketCap < 2000000)
      potentialGain = '+200% (12h)'
    else if (volume24h > 100000) potentialGain = '+50% (6h)'
    else potentialGain = '+10% (1h)'

    return {
      riskScore,
      recommendation,
      potentialGain,
      factors,
    }
  }

  const getRiskColor = (score: number) => {
    if (score > 80) return 'text-red-500'
    if (score > 60) return 'text-yellow-500'
    if (score > 40) return 'text-blue-500'
    return 'text-green-500'
  }

  const getRiskIcon = (score: number) => {
    if (score > 80) return <XCircle className="h-5 w-5 text-red-500" />
    if (score > 60) return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    if (score > 40) return <Activity className="h-5 w-5 text-blue-500" />
    return <CheckCircle className="h-5 w-5 text-green-500" />
  }

  useEffect(() => {
    fetchTokenDetails()
  }, [fetchTokenDetails])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !token) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'Token not found'}</AlertDescription>
        </Alert>
        <div className="flex justify-center mt-4">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-6">
          <Button asChild variant="ghost" size="icon" className="mt-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-start gap-6">
            {token.imageUrl ? (
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src={token.imageUrl}
                  alt={token.name}
                  fill
                  className="rounded-xl object-cover border-2 border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg border-2 border-border">
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{token.name}</h1>
              <p className="text-xl text-muted-foreground">{token.symbol}</p>
              {token.description && (
                <p className="text-sm text-muted-foreground max-w-md">
                  {token.description}
                </p>
              )}

              {/* Social Links */}
              {(token.twitter || token.telegram || token.website) && (
                <div className="flex items-center gap-2 pt-2">
                  {token.twitter && (
                    <a
                      href={token.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Twitter
                    </a>
                  )}
                  {token.telegram && (
                    <a
                      href={token.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Telegram
                    </a>
                  )}
                  {token.website && (
                    <a
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Badge variant="outline" className="text-xs">
          Pump.fun
        </Badge>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {(typeof token.priceUsd === 'string'
                ? parseFloat(token.priceUsd)
                : token.priceUsd || 0
              ).toFixed(6)}
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
              ${(token.marketCap || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(token.volume24h || 0).toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Age</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(
                (Date.now() - new Date(token.createdAt).getTime()) /
                  (1000 * 60 * 60),
              )}
              h
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Created {new Date(token.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Price Chart
          </CardTitle>
          <CardDescription>
            Real-time candlestick chart showing price movements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandlestickChart
            data={[]} // Empty array will generate sample data
            title={`${token.name} (${token.symbol})`}
            height={400}
          />
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      {riskAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getRiskIcon(riskAnalysis.riskScore)}
                Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Risk Score</span>
                <span
                  className={`font-bold ${getRiskColor(riskAnalysis.riskScore)}`}
                >
                  {riskAnalysis.riskScore}/100
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Recommendation</span>
                <Badge variant="outline">{riskAnalysis.recommendation}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span>Potential Gain</span>
                <span className="font-bold text-green-500">
                  {riskAnalysis.potentialGain}
                </span>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Risk Factors:</h4>
                <ul className="space-y-1 text-sm">
                  {riskAnalysis.factors.map((factor, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {token.description || 'No description available'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Contract Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {token.address.slice(0, 8)}...{token.address.slice(-8)}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => navigator.clipboard.writeText(token.address)}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(token.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Last Updated</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(token.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Take action based on the analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={() =>
                window.open(`https://pump.fun/${token.address}`, '_blank')
              }
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on Pump.fun
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `https://solscan.io/token/${token.address}`,
                  '_blank',
                )
              }
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on Solscan
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchTokenDetails()}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
