'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  Cell,
} from 'recharts'

interface CandleData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface CandlestickChartProps {
  data: CandleData[]
  title?: string
  height?: number
}

export function CandlestickChart({
  data,
  title = 'Candlestick Chart',
  height = 400,
}: CandlestickChartProps) {
  // If no data, generate sample candlestick data
  let candleData = data

  if (!data || data.length === 0) {
    // Generate 50 candles of sample data
    const now = new Date()
    let lastClose = 220 // Starting price

    candleData = Array.from({ length: 50 }, (_, i) => {
      const timestamp = new Date(now.getTime() - (49 - i) * 15 * 60 * 1000) // 15min intervals

      // Simulate realistic OHLC data
      const volatility = 0.02 // 2% volatility
      const trend = Math.sin(i * 0.1) * 0.01 // Slight trend

      const open = lastClose
      const randomMove1 = (Math.random() - 0.5) * volatility * open
      const randomMove2 = (Math.random() - 0.5) * volatility * open
      const trendMove = trend * open

      let high = open + Math.abs(randomMove1) + trendMove
      let low = open - Math.abs(randomMove2) + trendMove
      const close = open + randomMove1 + randomMove2 + trendMove

      // Ensure high is highest and low is lowest
      high = Math.max(high, open, close)
      low = Math.min(low, open, close)

      lastClose = close

      return {
        timestamp: timestamp.toISOString(),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.random() * 100000 + 10000,
      }
    })
  }

  if (!candleData || candleData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No candlestick data available</p>
      </div>
    )
  }

  // Prepare data for candlestick visualization
  const chartData = candleData.map((candle, index) => {
    const isGreen = candle.close >= candle.open
    const bodyHeight = Math.abs(candle.close - candle.open)
    const bodyTop = Math.max(candle.close, candle.open)
    const bodyBottom = Math.min(candle.close, candle.open)

    return {
      ...candle,
      isGreen,
      bodyHeight,
      bodyTop,
      bodyBottom,
      wickTop: candle.high - bodyTop,
      wickBottom: bodyBottom - candle.low,
      formattedTime: new Date(candle.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  })

  // Custom Candlestick Component
  const Candlestick = (props: any) => {
    const { payload, x, y, width, height } = props

    if (!payload) return null

    const candle = payload
    const isGreen = candle.isGreen
    const color = isGreen ? '#10b981' : '#ef4444' // Green or Red
    const candleWidth = Math.max(width * 0.6, 2) // Candle body width
    const wickWidth = 1 // Wick line width

    // Calculate positions
    const centerX = x + width / 2
    const candleX = centerX - candleWidth / 2

    // Scale factors (you'll need to calculate these based on your chart's scale)
    const priceRange =
      Math.max(...chartData.map((d) => d.high)) -
      Math.min(...chartData.map((d) => d.low))
    const pixelPerPrice = height / priceRange
    const baseY = y + height

    // Calculate Y positions
    const highY =
      baseY -
      (candle.high - Math.min(...chartData.map((d) => d.low))) * pixelPerPrice
    const lowY =
      baseY -
      (candle.low - Math.min(...chartData.map((d) => d.low))) * pixelPerPrice
    const openY =
      baseY -
      (candle.open - Math.min(...chartData.map((d) => d.low))) * pixelPerPrice
    const closeY =
      baseY -
      (candle.close - Math.min(...chartData.map((d) => d.low))) * pixelPerPrice

    const bodyTop = Math.min(openY, closeY)
    const bodyHeight = Math.abs(openY - closeY)

    return (
      <g>
        {/* High-Low Wick */}
        <line
          x1={centerX}
          y1={highY}
          x2={centerX}
          y2={lowY}
          stroke={color}
          strokeWidth={wickWidth}
        />
        {/* Candle Body */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={Math.max(bodyHeight, 1)}
          fill={isGreen ? color : color}
          stroke={color}
          strokeWidth={1}
          opacity={isGreen ? 0.8 : 1}
        />
      </g>
    )
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isGreen = data.close >= data.open
      const change = (((data.close - data.open) / data.open) * 100).toFixed(2)

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{data.formattedTime}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-mono">${data.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span className="font-mono text-green-400">
                ${data.high.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span className="font-mono text-red-400">
                ${data.low.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Close:</span>
              <span
                className={`font-mono ${isGreen ? 'text-green-400' : 'text-red-400'}`}
              >
                ${data.close.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t">
              <span className="text-muted-foreground">Change:</span>
              <span
                className={`font-mono ${isGreen ? 'text-green-400' : 'text-red-400'}`}
              >
                {isGreen ? '+' : ''}
                {change}%
              </span>
            </div>
            {data.volume && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-mono">
                  {data.volume.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // Get overall trend
  const firstPrice = chartData[0]?.open || 0
  const lastPrice = chartData[chartData.length - 1]?.close || 0
  const overallChange = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(
    2,
  )
  const isOverallPositive = lastPrice >= firstPrice

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">OHLC:</span>
          <span className="font-mono">
            O: ${chartData[0]?.open.toFixed(2)}
            H: ${Math.max(...chartData.map((d) => d.high)).toFixed(2)}
            L: ${Math.min(...chartData.map((d) => d.low)).toFixed(2)}
            C: ${chartData[chartData.length - 1]?.close.toFixed(2)}
          </span>
          <span
            className={`font-bold ${isOverallPositive ? 'text-green-400' : 'text-red-400'}`}
          >
            {isOverallPositive ? '↗' : '↘'} {isOverallPositive ? '+' : ''}
            {overallChange}%
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="formattedTime"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Render candlesticks using bars with custom shape */}
          <Bar dataKey="high" shape={<Candlestick />} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Market Summary */}
      <div className="grid grid-cols-4 gap-4 mt-4 text-center text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Open</span>
          <span className="font-mono">${chartData[0]?.open.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">High</span>
          <span className="font-mono text-green-400">
            ${Math.max(...chartData.map((d) => d.high)).toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Low</span>
          <span className="font-mono text-red-400">
            ${Math.min(...chartData.map((d) => d.low)).toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Close</span>
          <span
            className={`font-mono ${isOverallPositive ? 'text-green-400' : 'text-red-400'}`}
          >
            ${lastPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CandlestickChart
