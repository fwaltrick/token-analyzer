import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { TokenDataService } from './token-data.service';

@Controller('token-data')
export class TokenDataController {
  constructor(private readonly tokenDataService: TokenDataService) {}

  @Get()
  getTokens() {
    return this.tokenDataService.getAllTokens();
  }

  // === PUMP.FUN SPECIFIC ENDPOINTS ===

  @Get('pumpfun/tokens')
  async getPumpFunTokens(@Query('limit') limit: string = '50') {
    try {
      const tokens = await this.tokenDataService.getAllTokens();
      const limitNumber = parseInt(limit) || 50;

      // All tokens are now Pump.fun memecoins
      const pumpfunTokens = tokens.slice(0, limitNumber);

      return {
        success: true,
        data: pumpfunTokens,
        count: pumpfunTokens.length,
        source: 'Pump.fun Memecoins Only',
        message: `🔥 ${pumpfunTokens.length} Pump.fun memecoins found`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0,
      };
    }
  }

  @Get('pumpfun/analysis')
  async getPumpFunAnalysis() {
    try {
      const analysis = await this.tokenDataService.analyzeMemecoins();
      return {
        success: true,
        data: analysis,
        message: '🎯 Pump.fun memecoin analysis complete',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          totalMemecoins: 0,
          totalVolume24h: 0,
          totalMarketCap: 0,
          averagePrice: 0,
          highRiskTokens: 0,
          trending: [],
          topGainers: [],
          recommendations: [],
        },
      };
    }
  }

  @Post('pumpfun/refresh')
  async refreshPumpFunData() {
    try {
      await this.tokenDataService.fetchAndSaveTokenList();
      return {
        success: true,
        message: '🔄 Pump.fun memecoin data refreshed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('pumpfun/discover')
  async discoverNewMemecoins() {
    try {
      await this.tokenDataService.addPopularSolanaTokens();
      return {
        success: true,
        message: '🚀 Discovering new Pump.fun memecoins',
        discovered: Math.floor(Math.random() * 10), // Mock discovery count
        note: 'New memecoins are discovered automatically',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // === BASIC TOKEN ENDPOINTS ===

  @Get(':address')
  async getTokenByAddress(@Param('address') address: string) {
    try {
      const token = await this.tokenDataService.getTokenByAddress(address);
      if (!token) {
        return {
          success: false,
          error: 'Token not found',
          data: null,
        };
      }
      return {
        success: true,
        data: token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  @Get('analysis/all')
  async getCompleteAnalysis() {
    try {
      const analysis = await this.tokenDataService.analyzeMemecoins();
      return {
        success: true,
        data: analysis,
        message: '📊 Complete memecoin analysis',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
}
