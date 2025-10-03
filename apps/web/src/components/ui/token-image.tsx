'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface TokenImageProps {
  src?: string | null
  alt: string
  symbol: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function TokenImage({
  src,
  alt,
  symbol,
  className = '',
  size = 'sm',
}: TokenImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  useEffect(() => {
    if (!src || imageFailed) return

    setIsValidating(true)
    setImageLoaded(false)
    setImageFailed(false)

    // Pre-load image to check if it's valid
    const img = document.createElement('img')

    const timeout = setTimeout(() => {
      setImageFailed(true)
      setIsValidating(false)
    }, 3000) // 3s timeout

    img.onload = () => {
      clearTimeout(timeout)
      setImageLoaded(true)
      setIsValidating(false)
    }

    img.onerror = () => {
      clearTimeout(timeout)
      setImageFailed(true)
      setIsValidating(false)
    }

    img.src = src

    return () => {
      clearTimeout(timeout)
    }
  }, [src, imageFailed])

  // Show placeholder while loading or if no image
  if (!src || !imageLoaded || imageFailed) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center ${textSizes[size]} font-bold text-white relative ${className}`}
      >
        {symbol.slice(0, 2).toUpperCase()}
        {isValidating && (
          <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 border-white border-t-transparent border-2 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      className={`${sizeClasses[size]} rounded-full bg-gray-700 object-cover ${className}`}
      loading="lazy"
      unoptimized // For external IPFS URLs
    />
  )
}
