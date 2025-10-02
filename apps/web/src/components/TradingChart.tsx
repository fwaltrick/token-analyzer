'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface PriceData {
  timestamp: string
  price: number
  volume?: number
}

interface TradingChartProps {
  data: PriceData[]
  title?: string
  height?: number
}

export function TradingChart({
  data,
  title = 'Price Chart',
  height = 300,
}: TradingChartProps) {
  // If no data, generate sample data for demonstration
  let rawData = data

  if (!data || data.length === 0) {
    // Generate 24 hours of sample data
    const now = new Date()
    const basePrice = 220 // Sample base price
    rawData = Array.from({ length: 24 }, (_, i) => {
      const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000)
      const variation = (Math.random() - 0.5) * 20 // ±10 price variation
      const price = basePrice + variation + Math.sin(i * 0.3) * 5

      return {
        timestamp: timestamp.toISOString(),
        price: Math.max(price, 1), // Ensure price is positive
        volume: Math.random() * 100000 + 50000,
      }
    })
  }

  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No chart data available</p>
      </div>
    )
  }

  // Prepare data with price changes for coloring
  const chartData = rawData.map((item, index) => {
    const prevPrice = index > 0 ? rawData[index - 1].price : item.price
    const isPositive = item.price >= prevPrice

    return {
      ...item,
      isPositive,
      formattedTime: new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      formattedDate: new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }
  })

  // Get first and last price to determine overall trend
  const firstPrice = chartData[0]?.price || 0
  const lastPrice = chartData[chartData.length - 1]?.price || 0
  const overallPositive = lastPrice >= firstPrice

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{`${data.formattedDate} ${data.formattedTime}`}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Price: </span>
            <span
              className={data.isPositive ? 'text-green-400' : 'text-red-400'}
            >
              ${data.price.toFixed(6)}
            </span>
          </p>
          {data.volume && (
            <p className="text-sm">
              <span className="text-muted-foreground">Volume: </span>
              <span>${data.volume.toLocaleString()}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className={overallPositive ? 'text-green-400' : 'text-red-400'}>
            {overallPositive ? '↗' : '↘'}
            {(((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={overallPositive ? '#10b981' : '#ef4444'}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={overallPositive ? '#10b981' : '#ef4444'}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="formattedTime"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value.toFixed(4)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={overallPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Price action indicators */}
      <div className="grid grid-cols-3 gap-4 mt-4 text-center">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">First Price</span>
          <span className="font-mono text-sm">${firstPrice.toFixed(6)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Current Price</span>
          <span className="font-mono text-sm font-bold">
            ${lastPrice.toFixed(6)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Change</span>
          <span
            className={`font-mono text-sm ${overallPositive ? 'text-green-400' : 'text-red-400'}`}
          >
            {overallPositive ? '+' : ''}
            {(((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export default TradingChart
