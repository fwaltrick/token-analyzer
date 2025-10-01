import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  PatternAnalyzerService,
  TokenAnalysis,
} from './pattern-analyzer.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly patternAnalyzer: PatternAnalyzerService) {}

  /**
   * MVP Endpoint: Analyze all tokens or specific token
   * GET /analysis/patterns
   * GET /analysis/patterns?address=9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump
   */
  @Get('patterns')
  async analyzePatterns(@Query('address') address?: string) {
    const analyses = await this.patternAnalyzer.analyzeTokenPatterns(address);

    return {
      success: true,
      total: analyses.length,
      data: analyses,
      summary: {
        high_potential: analyses.filter((a) => a.overall_score >= 70).length,
        risky: analyses.filter(
          (a) => a.insider_activity.recommendation === 'avoid',
        ).length,
        new_tokens: analyses.filter((a) => a.migration_status === 'new').length,
      },
    };
  }

  /**
   * MVP Endpoint: Get high-potential tokens
   * GET /analysis/high-potential
   */
  @Get('high-potential')
  async getHighPotentialTokens() {
    const tokens = await this.patternAnalyzer.getHighPotentialTokens();

    return {
      success: true,
      message: 'Top tokens com alto potencial identificados',
      count: tokens.length,
      data: tokens,
    };
  }

  /**
   * MVP Endpoint: Get risky tokens to avoid
   * GET /analysis/risky
   */
  @Get('risky')
  async getRiskyTokens() {
    const tokens = await this.patternAnalyzer.getRiskyTokens();

    return {
      success: true,
      message: 'Tokens com atividade suspeita identificados',
      count: tokens.length,
      data: tokens,
      warning: 'Evite investir nestes tokens - alto risco de scam',
    };
  }

  /**
   * MVP Endpoint: Analyze specific token by address
   * GET /analysis/token/9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump
   */
  @Get('token/:address')
  async analyzeSpecificToken(@Param('address') address: string) {
    const analyses = await this.patternAnalyzer.analyzeTokenPatterns(address);

    if (analyses.length === 0) {
      return {
        success: false,
        error: 'Token não encontrado na base de dados',
        address,
      };
    }

    const analysis = analyses[0];

    return {
      success: true,
      address,
      analysis,
      recommendation: this.getRecommendation(analysis),
    };
  }

  /**
   * Helper para gerar recomendações baseadas na análise
   */
  private getRecommendation(analysis: {
    overall_score: number;
    insider_activity: { recommendation: string };
  }): {
    action: string;
    reason: string;
    confidence: string;
  } {
    const score = analysis.overall_score;
    const riskLevel = analysis.insider_activity.recommendation;

    if (riskLevel === 'avoid') {
      return {
        action: '🚨 EVITAR',
        reason: 'Alta atividade suspeita detectada',
        confidence: 'Alto',
      };
    }

    if (score >= 80) {
      return {
        action: '🚀 COMPRAR',
        reason: 'Excelente potencial identificado',
        confidence: 'Alto',
      };
    }

    if (score >= 60) {
      return {
        action: '👀 MONITORAR',
        reason: 'Bom potencial, aguardar confirmação',
        confidence: 'Médio',
      };
    }

    return {
      action: '⚠️ CAUTELA',
      reason: 'Sinais mistos, risco moderado',
      confidence: 'Baixo',
    };
  }
}
