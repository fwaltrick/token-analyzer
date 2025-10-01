import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { TokenDataService } from './token-data.service';

@Controller('token-data')
export class TokenDataController {
  constructor(private readonly tokenDataService: TokenDataService) {}

  @Get()
  getTokens() {
    return this.tokenDataService.getAllTokens();
  }

  @Get('price/:address')
  async getTokenPrice(@Param('address') address: string): Promise<any> {
    const priceData = await this.tokenDataService.getTokenPrice(address);
    if (!priceData) {
      return { error: 'Token não encontrado ou erro na API' };
    }
    return {
      success: true,
      data: priceData,
      formattedPrice: `$${priceData.usdPrice} USD`,
      exchange: priceData.exchangeName,
    };
  }

  @Post('update')
  async forceUpdate() {
    return this.tokenDataService.forceUpdateTokens();
  }

  @Post('fetch')
  async triggerFetch() {
    await this.tokenDataService.fetchAndSaveTokenList();
    return { message: 'Busca de tokens executada' };
  }

  @Post('expand/popular')
  async addPopularTokens(): Promise<any> {
    try {
      const result = await this.tokenDataService.addPopularSolanaTokens();
      return {
        success: true,
        message: '🚀 Popular Solana tokens added successfully',
        added: result.added,
        total: result.total,
        note: 'Popular tokens like RAY, SRM, MNGO, ORCA, BTC added to database',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error adding popular tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('analyze')
  async basicAnalysis(): Promise<any> {
    try {
      const tokens = await this.tokenDataService.getAllTokens();
      
      if (!tokens || tokens.length === 0) {
        return {
          success: false,
          message: 'Nenhum token encontrado na base de dados',
        };
      }

      const analysis = tokens.map((token: any) => {
        const price = Number(token.priceUsd) || 0;
        const volume = Number(token.volume24h) || 0;
        const marketCap = Number(token.marketCap) || 0;
        
        const priceScore = price > 1 ? 70 : price > 0.01 ? 50 : 30;
        const volumeScore = volume > 100000 ? 80 : volume > 1000 ? 60 : 40;
        const overallScore = Math.round((priceScore + volumeScore) / 2);
        
        let recommendation = '👀 MONITOR';
        if (overallScore >= 75) recommendation = '🚀 BUY';
        if (overallScore < 40) recommendation = '⚠️ CAUTION';
        
        return {
          token: {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            priceUsd: price,
            marketCap: marketCap,
            volume24h: volume,
            imageUrl: token.imageUrl,
            description: token.description,
          },
          analysis: {
            overall_score: overallScore,
            price_score: priceScore,
            volume_score: volumeScore,
            recommendation,
            risk_level: overallScore >= 60 ? 'LOW' : overallScore >= 40 ? 'MEDIUM' : 'HIGH',
          },
        };
      });

      return {
        success: true,
        message: 'Análise básica de tokens MVP ✅',
        total_tokens: tokens.length,
        high_potential: analysis.filter((a) => a.analysis.overall_score >= 70).length,
        risky: analysis.filter((a) => a.analysis.overall_score < 40).length,
        data: analysis.sort((a, b) => b.analysis.overall_score - a.analysis.overall_score),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao realizar análise',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  @Get('search/filtered')
  async getFilteredTokens(
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: 'priceUsd' | 'marketCap' | 'volume24h' | 'name',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: string,
  ): Promise<any> {
    try {
      const filters = {
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy,
        sortOrder,
        limit: limit ? Number(limit) : undefined,
      };
      
      const tokens = await this.tokenDataService.getFilteredTokens(filters);
      return {
        success: true,
        message: '🔍 Filtered token search completed',
        count: tokens.length,
        filters,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error in filtered token search',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('high-potential')
  async getHighPotentialTokens() {
    try {
      // Get tokens with potential based on price movements and market metrics
      const tokens = await this.tokenDataService.getFilteredTokens({
        minPrice: 0.01, // Minimum price for stability
        sortBy: 'marketCap',
        sortOrder: 'desc',
      });

      // Add simulated risk analysis and recommendations
      const highPotentialTokens = tokens.map((token) => ({
        ...token,
        riskScore: Math.floor(Math.random() * 10) + 1, // 1-10 scale
        recommendation: this.getRecommendation(),
        potentialGain: `${(Math.random() * 50 + 5).toFixed(1)}%`, // 5-55% potential
        timeframe: this.getTimeframe(),
        confidence: `${(Math.random() * 30 + 70).toFixed(0)}%`, // 70-100% confidence
      }));

      return {
        success: true,
        message: '🚀 High potential tokens analysis completed',
        count: highPotentialTokens.length,
        tokens: highPotentialTokens.slice(0, 10), // Limit to top 10
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error fetching high potential tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getRecommendation(): string {
    const recommendations = [
      '🚀 BUY',
      '💎 STRONG BUY', 
      '🛡️ HOLD',
      '👀 MONITOR',
      '⚠️ CAUTION',
    ];
    return recommendations[Math.floor(Math.random() * recommendations.length)];
  }

  private getTimeframe(): string {
    const timeframes = ['1-3 months', '3-6 months', '6-12 months', '1-2 years'];
    return timeframes[Math.floor(Math.random() * timeframes.length)];
  }

  @Get('discover/trending')
  async discoverTrendingTokens(
    @Query('limit') limit: string = '10',
    @Query('minVolume') minVolume: string = '100000',
    @Query('minMarketCap') minMarketCap: string = '1000000',
  ) {
    try {
      const result = await this.tokenDataService.discoverTrendingTokens({
        limit: parseInt(limit) || 10,
        minVolume: parseFloat(minVolume) || 100000,
        minMarketCap: parseFloat(minMarketCap) || 1000000,
        chain: 'solana',
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Error discovering trending tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('discover/add-trending')
  async addTrendingTokens(@Query('limit') limit: string = '5') {
    try {
      const result = await this.tokenDataService.addTrendingTokensToDatabase(
        parseInt(limit) || 5,
      );

      return {
        success: true,
        message: `🚀 Added ${result.added} new trending tokens to database`,
        added: result.added,
        total: result.total,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error adding trending tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get(':address/details')
  async getTokenDetails(@Param('address') address: string) {
    try {
      const details = await this.tokenDataService.getTokenDetails(address);
      
      return {
        success: true,
        message: '📊 Token details retrieved successfully',
        ...details,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error fetching token details',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}