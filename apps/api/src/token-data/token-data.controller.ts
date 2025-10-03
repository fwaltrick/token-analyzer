import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { TokenDataService } from './token-data.service';

@Controller('token-data')
export class TokenDataController {
  constructor(private readonly tokenDataService: TokenDataService) {}

  @Get()
  getTokens(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: string = 'desc',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    return this.tokenDataService.getAllTokens(
      pageNum,
      limitNum,
      sortBy,
      sortOrder,
    );
  }

  // === PUMP.FUN SPECIFIC ENDPOINTS ===

  @Get('pumpfun/tokens')
  async getPumpFunTokens(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: string = 'desc',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const limitNumber = parseInt(limit) || 50;

      const result = await this.tokenDataService.getAllTokens(
        pageNum,
        limitNumber,
        sortBy,
        sortOrder,
      );

      return {
        success: true,
        data: result.tokens,
        pagination: result.pagination,
        source: 'Pump.fun Memecoins Only',
        message: `🔥 ${result.tokens.length} Pump.fun memecoins found (page ${result.pagination.page}/${result.pagination.totalPages})`,
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
      await this.tokenDataService.fetchAndStoreLatestTokens();
      return {
        success: true,
        message: '🚀 Discovering new Pump.fun memecoins',
        note: 'New memecoins are discovered automatically via WebSocket',
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

  @Post('cleanup')
  async manualCleanup() {
    try {
      await this.tokenDataService.manualCleanupOldTokens();
      return {
        success: true,
        message: 'Token cleanup completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('process-missing-images')
  async processMissingImages() {
    try {
      const result =
        await this.tokenDataService.processTokensWithMissingImages();
      return {
        success: true,
        message: `Processed ${result.processed} tokens with missing images`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
