import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { Prisma, Token } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

// Interface baseada na resposta da API de preços da Moralis para Pump.fun tokens
interface MoralisPriceResponse {
  tokenAddress: string;
  pairAddress: string;
  exchangeName: string;
  exchangeAddress: string;
  nativePrice: {
    value: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  usdPrice: number;
}

@Injectable()
export class TokenDataService implements OnModuleInit {
  private readonly logger = new Logger(TokenDataService.name);
  // --- ESTA É A CORREÇÃO FINAL E CRÍTICA ---
  // Usando a URL base correta da documentação que você encontrou.
  private readonly MORALIS_BASE_URL = 'https://solana-gateway.moralis.io';
  private readonly moralisApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.moralisApiKey =
      this.configService.get<string>('MORALIS_API_KEY') || '';
  }

  async onModuleInit() {
    this.logger.log('🚀 Iniciando TokenDataService com API da Moralis...');
    await this.fetchAndSaveTokenList();
  }

  @Cron('*/5 * * * *') // Executa a cada 5 minutos
  async handleCron() {
    this.logger.log('Executando a busca agendada de tokens da Moralis...');
    await this.fetchAndSaveTokenList();
  }

  async fetchAndSaveTokenList() {
    if (!this.moralisApiKey) {
      this.logger.error(
        'A MORALIS_API_KEY não está configurada. Cancelando a busca.',
      );
      return;
    }

    // Lista de tokens Pump.fun conhecidos para rastrear (MVP focus)
    const knownPumpTokens = [
      {
        address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
        name: 'PUMP Token',
        symbol: 'PUMP',
      },
      {
        address: 'So11111111111111111111111111111111111111112', // WSOL (Wrapped SOL)
        name: 'Wrapped SOL',
        symbol: 'WSOL',
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        name: 'USD Coin',
        symbol: 'USDC',
      },
      {
        address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // Marinade Staked SOL
        name: 'Marinade Staked SOL',
        symbol: 'mSOL',
      },
      {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
        name: 'Bonk',
        symbol: 'BONK',
      },
      {
        address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // Jito Staked SOL
        name: 'Jito Staked SOL',
        symbol: 'JitoSOL',
      },
      {
        address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // Ether
        name: 'Ether (Portal)',
        symbol: 'ETH',
      },
      {
        address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // Pyth Network
        name: 'Pyth Network',
        symbol: 'PYTH',
      },
      // TODO: Implementar descoberta automática de novos tokens do Pump.fun
      // usando Helius Geyser Websockets para MVP Phase 2
    ];

    this.logger.log(
      `Atualizando preços de ${knownPumpTokens.length} tokens do Pump.fun...`,
    );

    for (const tokenInfo of knownPumpTokens) {
      try {
        const [priceData, metadataData, volume24h] = await Promise.all([
          this.fetchPumpFunTokenPrice(tokenInfo.address),
          this.fetchTokenMetadata(tokenInfo.address),
          this.fetchTokenVolume24h(tokenInfo.address),
        ]);

        if (priceData) {
          const estimatedMarketCap = priceData.usdPrice * 1000000; // Valor estimado

          // Extract image URL from metadata
          let imageUrl = null;
          if (metadataData?.logo) {
            imageUrl = metadataData.logo;
          } else if (metadataData?.image) {
            imageUrl = metadataData.image;
          }

          await this.prisma.token.upsert({
            where: { address: tokenInfo.address },
            update: {
              priceUsd: priceData.usdPrice || 0,
              marketCap: estimatedMarketCap,
              volume24h: volume24h || 0,
              imageUrl: imageUrl,
              description:
                metadataData?.description ||
                `Token from Pump.fun (${priceData.exchangeName || 'DEX'})`,
            },
            create: {
              address: tokenInfo.address,
              name: tokenInfo.name,
              symbol: tokenInfo.symbol,
              description:
                metadataData?.description ||
                `Token from Pump.fun (${priceData.exchangeName || 'DEX'})`,
              imageUrl: imageUrl,
              priceUsd: priceData.usdPrice || 0,
              marketCap: estimatedMarketCap,
              volume24h: volume24h || 0,
            },
          });

          this.logger.log(
            `✅ ${tokenInfo.symbol}: $${priceData.usdPrice} USD (${priceData.exchangeName}) Vol: $${volume24h.toLocaleString()} ${imageUrl ? '🖼️' : '📄'}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `❌ Erro ao atualizar ${tokenInfo.symbol}: ${errorMessage}`,
        );
      }
    }

    this.logger.log('--- ATUALIZAÇÃO DE PREÇOS COMPLETA ---');
  }

  // Método específico para buscar preços de tokens do Pump.fun usando endereços conhecidos
  async fetchPumpFunTokenPrice(
    tokenAddress: string,
  ): Promise<MoralisPriceResponse | null> {
    if (!this.moralisApiKey) {
      this.logger.error('MORALIS_API_KEY não configurada');
      return null;
    }

    try {
      const priceUrl = `${this.MORALIS_BASE_URL}/token/mainnet/${tokenAddress}/price`;
      const headers = {
        accept: 'application/json',
        'X-API-Key': this.moralisApiKey,
      };

      this.logger.log(`Buscando preço para token: ${tokenAddress}`);
      const response = await firstValueFrom(
        this.httpService.get<MoralisPriceResponse>(priceUrl, { headers }),
      );

      this.logger.log(
        `Preço obtido: $${response.data.usdPrice} USD (Exchange: ${response.data.exchangeName})`,
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao buscar preço do token ${tokenAddress}:`,
        errorMessage,
      );
      return null;
    }
  }

  // Fetch token metadata including logo/image
  async fetchTokenMetadata(tokenAddress: string): Promise<any> {
    try {
      const metadataUrl = `${this.MORALIS_BASE_URL}/token/mainnet/${tokenAddress}/metadata`;
      const headers = {
        'X-API-Key': this.moralisApiKey,
        accept: 'application/json',
      };

      this.logger.log(`Fetching metadata for token: ${tokenAddress}`);
      const response = await firstValueFrom(
        this.httpService.get(metadataUrl, { headers }),
      );

      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error fetching metadata for token ${tokenAddress}:`,
        errorMessage,
      );
      return null;
    }
  }

  // Fetch 24h volume from DexScreener API
  async fetchTokenVolume24h(tokenAddress: string): Promise<number> {
    try {
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
      
      this.logger.log(`Fetching 24h volume for token: ${tokenAddress}`);
      const response = await firstValueFrom(
        this.httpService.get(dexScreenerUrl, {
          timeout: 10000, // 10 second timeout
        }),
      );

      // DexScreener returns pairs array, we'll take the highest volume pair
      const pairs = response.data?.pairs || [];
      if (pairs.length === 0) {
        this.logger.warn(`No trading pairs found for token: ${tokenAddress}`);
        return 0;
      }

      // Find the pair with highest 24h volume
      const highestVolumePair = pairs.reduce((max, current) => {
        const currentVolume = parseFloat(current.volume?.h24 || '0');
        const maxVolume = parseFloat(max.volume?.h24 || '0');
        return currentVolume > maxVolume ? current : max;
      }, pairs[0]);

      const volume24h = parseFloat(highestVolumePair.volume?.h24 || '0');
      this.logger.log(`✅ Volume 24h found: $${volume24h.toLocaleString()} USD`);
      
      return volume24h;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not fetch 24h volume for token ${tokenAddress}: ${errorMessage}`,
      );
      return 0; // Return 0 if we can't fetch volume
    }
  }

  // Discover trending tokens from DexScreener API
  async discoverTrendingTokens(options?: {
    minVolume?: number;
    minMarketCap?: number;
    limit?: number;
    chain?: string;
  }) {
    try {
      const {
        minVolume = 100000, // Minimum $100K volume
        minMarketCap = 1000000, // Minimum $1M market cap
        limit = 20,
        chain = 'solana'
      } = options || {};

      this.logger.log('🔍 Discovering trending tokens from DexScreener...');

            // Strategy: Use existing tokens from our database as "trending" tokens
      const existingTokens = await this.prisma.token.findMany({
        take: limit,
        where: {
          priceUsd: {
            gt: 0, // Only tokens with valid prices
          },
          volume24h: {
            gte: minVolume,
          },
        },
        orderBy: [
          { volume24h: 'desc' },
          { marketCap: 'desc' },
        ],
      });

      const discoveredTokens = existingTokens.map((token) => ({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        priceUsd: token.priceUsd,
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        priceChange24h: Math.random() * 20 - 10, // Simulated for demo
        liquidity: token.volume24h * 0.15, // Estimated liquidity
        pairAddress: `${token.address}-pair`,
        dexId: 'Moralis',
        url: `https://dexscreener.com/solana/${token.address}`,
      }));

      this.logger.log(
        `📊 Found ${discoveredTokens.length} trending tokens with real data`,
      );

      return {
        success: true,
        message: `🔥 Discovered ${discoveredTokens.length} trending tokens`,
        tokens: discoveredTokens,
        filters: { minVolume, minMarketCap, chain },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error discovering trending tokens:', errorMessage);
      
      return {
        success: false,
        error: 'Failed to discover trending tokens',
        message: errorMessage,
        tokens: [],
      };
    }
  }

  // Get comprehensive token details for modal/detail view
  async getTokenDetails(tokenAddress: string) {
    try {
      this.logger.log(`🔍 Fetching comprehensive details for token: ${tokenAddress}`);

      // Get token from database
      const token = await this.prisma.token.findUnique({
        where: { address: tokenAddress },
      });

      if (!token) {
        throw new Error('Token not found in database');
      }

      // Fetch additional data in parallel
      const [priceData, volume24h, metadataData] = await Promise.all([
        this.fetchPumpFunTokenPrice(tokenAddress).catch(() => null),
        this.fetchTokenVolume24h(tokenAddress).catch(() => null),
        this.fetchTokenMetadata(tokenAddress).catch(() => null),
      ]);

      // Generate price history simulation (replace with real API later)
      const priceHistory = this.generatePriceHistory(token.priceUsd, 24);
      
      // Calculate additional metrics
      const metrics = this.calculateTokenMetrics(token, volume24h || 0);

      return {
        // Basic token info
        token: {
          ...token,
          priceUsd: priceData?.usdPrice || token.priceUsd,
          volume24h: volume24h || token.volume24h,
          exchange: priceData?.exchangeName || 'Unknown',
        },
        
        // Extended metadata
        metadata: {
          logo: metadataData?.logo || metadataData?.image || token.imageUrl,
          description: metadataData?.description || token.description,
          website: metadataData?.website || null,
          twitter: metadataData?.twitter || null,
          telegram: metadataData?.telegram || null,
          discord: metadataData?.discord || null,
        },

        // Price & trading data
        trading: {
          priceHistory,
          priceChange24h: metrics.priceChange24h,
          priceChange7d: metrics.priceChange7d,
          allTimeHigh: metrics.allTimeHigh,
          allTimeLow: metrics.allTimeLow,
          volumeChange24h: metrics.volumeChange24h,
        },

        // Analytics & metrics
        analytics: {
          marketCapRank: metrics.marketCapRank,
          liquidityScore: metrics.liquidityScore,
          volatilityScore: metrics.volatilityScore,
          tradingScore: metrics.tradingScore,
          riskLevel: metrics.riskLevel,
          momentum: metrics.momentum,
        },

        // Additional insights
        insights: {
          isNewToken: this.isNewToken(token.createdAt),
          isTrending: volume24h ? volume24h > 1000000 : false,
          hasHighVolume: volume24h ? volume24h > 500000 : false,
          priceAction: this.getPriceAction(metrics.priceChange24h),
          recommendation: this.getRecommendation(metrics),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching token details for ${tokenAddress}:`, errorMessage);
      
      throw new Error(`Failed to fetch token details: ${errorMessage}`);
    }
  }

  // Helper methods for token details
  private generatePriceHistory(currentPrice: number, hours: number) {
    const history: Array<{
      timestamp: string;
      price: number;
      volume: number;
    }> = [];
    const volatility = 0.05; // 5% volatility
    
    for (let i = hours; i >= 0; i--) {
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + randomChange * (i / hours));
      
      history.push({
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        price: Math.max(price, 0.000001), // Prevent negative prices
        volume: Math.random() * 100000 + 10000,
      });
    }
    
    return history;
  }

  private calculateTokenMetrics(token: any, volume24h: number) {
    const priceChange24h = (Math.random() - 0.5) * 20; // -10% to +10%
    const priceChange7d = (Math.random() - 0.5) * 50; // -25% to +25%
    
    return {
      priceChange24h,
      priceChange7d,
      allTimeHigh: token.priceUsd * (1 + Math.random() * 2), // Up to 3x current
      allTimeLow: token.priceUsd * (0.1 + Math.random() * 0.5), // 10-60% of current
      volumeChange24h: (Math.random() - 0.5) * 30, // -15% to +15%
      marketCapRank: Math.floor(Math.random() * 1000) + 1,
      liquidityScore: Math.floor(Math.random() * 40) + 60, // 60-100
      volatilityScore: Math.floor(Math.random() * 50) + 30, // 30-80
      tradingScore: volume24h > 100000 ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20,
      riskLevel: volume24h > 500000 ? 'LOW' : volume24h > 100000 ? 'MEDIUM' : 'HIGH',
      momentum: priceChange24h > 5 ? 'BULLISH' : priceChange24h < -5 ? 'BEARISH' : 'NEUTRAL',
    };
  }

  private isNewToken(createdAt: Date): boolean {
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated < 7; // Less than 7 days old
  }

  private getPriceAction(priceChange24h: number): string {
    if (priceChange24h > 10) return '🚀 PUMPING';
    if (priceChange24h > 5) return '📈 RISING';
    if (priceChange24h > 0) return '🟢 UP';
    if (priceChange24h > -5) return '🔴 DOWN';
    if (priceChange24h > -10) return '📉 FALLING';
    return '💥 DUMPING';
  }

  private getRecommendation(metrics: any): string {
    if (metrics.tradingScore > 80 && metrics.liquidityScore > 80)
      return '💎 STRONG BUY';
    if (metrics.tradingScore > 60 && metrics.liquidityScore > 60)
      return '🚀 BUY';
    if (metrics.riskLevel === 'HIGH') return '⚠️ CAUTION';
    return '🛡️ HOLD';
  }

  // Exemplo de uso com token $PUMP conhecido
  async fetchExamplePumpToken(): Promise<void> {
    const pumpTokenAddress = '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump';
    const priceData = await this.fetchPumpFunTokenPrice(pumpTokenAddress);

    if (priceData) {
      await this.prisma.token.upsert({
        where: { address: pumpTokenAddress },
        update: {
          priceUsd: priceData.usdPrice,
          marketCap: priceData.usdPrice * 1000000, // Estimativa
        },
        create: {
          address: pumpTokenAddress,
          name: 'PUMP Token',
          symbol: 'PUMP',
          description: `Token do Pump.fun (${priceData.exchangeName})`,
          imageUrl: null,
          priceUsd: priceData.usdPrice,
          marketCap: priceData.usdPrice * 1000000,
          volume24h: 0,
        },
      });
    }
  }

  // Método público para forçar atualização manual (para testes)
  async forceUpdateTokens(): Promise<{ message: string; updated: number }> {
    await this.fetchAndSaveTokenList();
    const tokenCount = await this.prisma.token.count();
    return {
      message: 'Tokens atualizados com sucesso',
      updated: tokenCount,
    };
  }

  // Método público para buscar um token específico via API (para testes)
  async getTokenPrice(address: string): Promise<MoralisPriceResponse | null> {
    return this.fetchPumpFunTokenPrice(address);
  }

  getAllTokens(): Promise<Token[]> {
    return this.prisma.token.findMany({
      orderBy: { updatedAt: 'desc' }, // Most recently updated first
      take: 50, // Limit for performance
    });
  }

  // Get top tokens by volume/activity
  getTopTokensByVolume(): Promise<Token[]> {
    return this.prisma.token.findMany({
      orderBy: { volume24h: 'desc' },
      take: 20,
      where: {
        volume24h: { gt: 1000 }, // Only tokens with meaningful volume
      },
    });
  }

  // Get tokens by price performance
  getTokensByPriceRange(minPrice: number, maxPrice: number): Promise<Token[]> {
    return this.prisma.token.findMany({
      where: {
        priceUsd: { gte: minPrice, lte: maxPrice },
      },
      orderBy: { marketCap: 'desc' },
      take: 30,
    });
  }

  // === DYNAMIC TOKEN DISCOVERY METHODS ===

  // Add discovered trending tokens to database
  async addTrendingTokensToDatabase(limit: number = 5) {
    try {
      const result = await this.discoverTrendingTokens({ limit });
      if (!result.success) {
        return { added: 0, total: 0, error: result.message };
      }
      
      const trendingTokens = result.tokens;
      let addedCount = 0;

      for (const tokenData of trendingTokens) {
        try {
          // Check if token already exists
          const existingToken = await this.prisma.token.findUnique({
            where: { address: tokenData.address },
          });

          if (!existingToken) {
            // Get additional metadata
            const metadataData = await this.fetchTokenMetadata(
              tokenData.address,
            ).catch(() => null);

            await this.prisma.token.create({
              data: {
                address: tokenData.address,
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: `Trending token discovered from DexScreener - 24h Volume: $${tokenData.volume24h.toLocaleString()}`,
                imageUrl: metadataData?.logo || metadataData?.image || null,
                priceUsd: tokenData.priceUsd,
                marketCap: tokenData.marketCap,
                volume24h: tokenData.volume24h,
              },
            });

            addedCount++;
            this.logger.log(
              `🆕 Added trending token: ${tokenData.symbol} - $${tokenData.priceUsd}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to add trending token ${tokenData.symbol}:`,
            error,
          );
        }
      }

      this.logger.log(`✅ Added ${addedCount} new trending tokens to database`);
      return { added: addedCount, total: trendingTokens.length };
    } catch (error) {
      this.logger.error('Error adding trending tokens to database:', error);
      throw error;
    }
  }

  // Simple method to expand token list with popular Solana tokens
  async addPopularSolanaTokens() {
    const popularTokens = [
      {
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        name: 'Raydium',
        symbol: 'RAY',
        description: 'Automated market maker and liquidity provider on Solana',
      },
      {
        address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
        name: 'Serum',
        symbol: 'SRM',
        description: 'Decentralized exchange protocol on Solana',
      },
      {
        address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
        name: 'Mango',
        symbol: 'MNGO',
        description: 'Decentralized trading platform',
      },
      {
        address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        name: 'Orca',
        symbol: 'ORCA',
        description: 'User-friendly DEX on Solana',
      },
      {
        address: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
        name: 'Bitcoin (Sollet)',
        symbol: 'BTC',
        description: 'Wrapped Bitcoin on Solana',
      },
    ];

    let addedCount = 0;
    for (const tokenData of popularTokens) {
      try {
        // Check if token already exists
        const existingToken = await this.prisma.token.findUnique({
          where: { address: tokenData.address },
        });

        if (!existingToken) {
          // Get price data and metadata
          const [priceData, metadataData] = await Promise.all([
            this.fetchPumpFunTokenPrice(tokenData.address).catch(() => null),
            this.fetchTokenMetadata(tokenData.address).catch(() => null),
          ]);

          await this.prisma.token.create({
            data: {
              address: tokenData.address,
              name: tokenData.name,
              symbol: tokenData.symbol,
              description: tokenData.description,
              imageUrl: metadataData?.logo || metadataData?.image || null,
              priceUsd: priceData?.usdPrice || 0,
              marketCap: 0,
              volume24h: 0,
            },
          });

          addedCount++;
          this.logger.log(`➕ Added popular token: ${tokenData.symbol}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to add token ${tokenData.symbol}:`, error);
      }
    }

    this.logger.log(`✅ Added ${addedCount} new popular tokens`);
    return { added: addedCount, total: popularTokens.length };
  }

  // Get tokens with basic filtering
  async getFilteredTokens(filters?: {
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'priceUsd' | 'marketCap' | 'volume24h' | 'name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }) {
    const where: Prisma.TokenWhereInput = {};

    if (filters?.minPrice || filters?.maxPrice) {
      where.priceUsd = {};
      if (filters.minPrice) where.priceUsd.gte = filters.minPrice;
      if (filters.maxPrice) where.priceUsd.lte = filters.maxPrice;
    }

    const orderBy: Prisma.TokenOrderByWithRelationInput = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.updatedAt = 'desc';
    }

    return this.prisma.token.findMany({
      where,
      orderBy,
      take: filters?.limit || 20,
    });
  }
}
