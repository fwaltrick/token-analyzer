import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
  priceUsd: string;
  priceChange: {
    h24: number;
  };
  volume: {
    h24: number;
  };
  marketCap: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { type: string; url: string }[];
  };
}

interface TokenDiscoveryFilters {
  minVolume24h?: number;
  maxVolume24h?: number;
  minPriceChange24h?: number;
  maxPriceChange24h?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

@Injectable()
export class TokenDiscoveryService {
  private readonly logger = new Logger(TokenDiscoveryService.name);

  constructor(private readonly httpService: HttpService) {}

  // Discover trending tokens from DexScreener
  async discoverTrendingTokens(
    filters: TokenDiscoveryFilters = {},
  ): Promise<DexScreenerToken[]> {
    try {
      this.logger.log(
        '🔍 Discovering trending Solana tokens from DexScreener...',
      );

      // DexScreener API for trending Solana tokens
      const url =
        'https://api.dexscreener.com/latest/dex/tokens/trending/solana';

      const response = await firstValueFrom(
        this.httpService.get<{ pairs: any[] }>(url),
      );

      if (!response.data?.pairs) {
        this.logger.warn('No trending tokens found from DexScreener');
        return [];
      }

      // Transform and filter the data
      const tokens: DexScreenerToken[] = response.data.pairs
        .map((pair: any) => ({
          address: pair.baseToken?.address,
          name: pair.baseToken?.name,
          symbol: pair.baseToken?.symbol,
          priceUsd: pair.priceUsd || '0',
          priceChange: {
            h24: parseFloat(pair.priceChange?.h24 || '0'),
          },
          volume: {
            h24: parseFloat(pair.volume?.h24 || '0'),
          },
          marketCap: parseFloat(pair.marketCap || '0'),
          info: {
            imageUrl: pair.info?.imageUrl,
            websites: pair.info?.websites || [],
            socials: pair.info?.socials || [],
          },
        }))
        .filter((token: DexScreenerToken) => {
          return (
            token.address &&
            token.name &&
            token.symbol &&
            this.applyFilters(token, filters)
          );
        });

      this.logger.log(
        `✅ Found ${tokens.length} trending tokens after filtering`,
      );
      return tokens.slice(0, filters.limit || 50);
    } catch (error) {
      this.logger.error('Error discovering trending tokens:', error);
      return [];
    }
  }

  // Get tokens with highest volume spikes
  async getHighVolumeTokens(
    filters: TokenDiscoveryFilters = {},
  ): Promise<DexScreenerToken[]> {
    try {
      this.logger.log('📈 Finding high volume Solana tokens...');

      const url = 'https://api.dexscreener.com/latest/dex/search/?q=SOL';

      const response = await firstValueFrom(
        this.httpService.get<{ pairs: any[] }>(url),
      );

      if (!response.data?.pairs) {
        return [];
      }

      const tokens: DexScreenerToken[] = response.data.pairs
        .filter((pair: any) => pair.chainId === 'solana')
        .map((pair: any) => ({
          address: pair.baseToken?.address,
          name: pair.baseToken?.name,
          symbol: pair.baseToken?.symbol,
          priceUsd: pair.priceUsd || '0',
          priceChange: {
            h24: parseFloat(pair.priceChange?.h24 || '0'),
          },
          volume: {
            h24: parseFloat(pair.volume?.h24 || '0'),
          },
          marketCap: parseFloat(pair.marketCap || '0'),
          info: {
            imageUrl: pair.info?.imageUrl,
          },
        }))
        .filter((token: DexScreenerToken) => {
          return (
            token.address &&
            token.volume.h24 > (filters.minVolume24h || 10000) &&
            this.applyFilters(token, filters)
          );
        })
        .sort((a, b) => b.volume.h24 - a.volume.h24);

      return tokens.slice(0, filters.limit || 30);
    } catch (error) {
      this.logger.error('Error getting high volume tokens:', error);
      return [];
    }
  }

  // Get tokens with significant price movements
  async getMooningSaggingTokens(filters: TokenDiscoveryFilters = {}): Promise<{
    mooning: DexScreenerToken[];
    sagging: DexScreenerToken[];
  }> {
    const trending = await this.discoverTrendingTokens({
      ...filters,
      limit: 100,
    });

    const mooning = trending
      .filter(
        (token) => token.priceChange.h24 > (filters.minPriceChange24h || 20),
      )
      .sort((a, b) => b.priceChange.h24 - a.priceChange.h24)
      .slice(0, 20);

    const sagging = trending
      .filter(
        (token) => token.priceChange.h24 < (filters.maxPriceChange24h || -10),
      )
      .sort((a, b) => a.priceChange.h24 - b.priceChange.h24)
      .slice(0, 20);

    return { mooning, sagging };
  }

  // Apply filtering criteria
  private applyFilters(
    token: DexScreenerToken,
    filters: TokenDiscoveryFilters,
  ): boolean {
    const price = parseFloat(token.priceUsd);

    if (filters.minVolume24h && token.volume.h24 < filters.minVolume24h)
      return false;
    if (filters.maxVolume24h && token.volume.h24 > filters.maxVolume24h)
      return false;
    if (
      filters.minPriceChange24h &&
      token.priceChange.h24 < filters.minPriceChange24h
    )
      return false;
    if (
      filters.maxPriceChange24h &&
      token.priceChange.h24 > filters.maxPriceChange24h
    )
      return false;
    if (filters.minMarketCap && token.marketCap < filters.minMarketCap)
      return false;
    if (filters.maxMarketCap && token.marketCap > filters.maxMarketCap)
      return false;
    if (filters.minPrice && price < filters.minPrice) return false;
    if (filters.maxPrice && price > filters.maxPrice) return false;

    return true;
  }

  // Get filter presets for common use cases
  getFilterPresets(): Record<string, TokenDiscoveryFilters> {
    return {
      trending: {
        minVolume24h: 50000,
        minPriceChange24h: 10,
        maxMarketCap: 100000000, // 100M max
        limit: 25,
      },
      highVolume: {
        minVolume24h: 500000,
        limit: 20,
      },
      moonshots: {
        minPriceChange24h: 50,
        minVolume24h: 10000,
        limit: 15,
      },
      safeOptions: {
        minMarketCap: 1000000, // 1M min
        maxPriceChange24h: 20,
        minPriceChange24h: -20,
        minVolume24h: 100000,
        limit: 30,
      },
      smallCaps: {
        maxMarketCap: 10000000, // 10M max
        minVolume24h: 25000,
        limit: 40,
      },
    };
  }
}
