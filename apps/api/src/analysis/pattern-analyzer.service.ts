import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Token } from '@prisma/client';

// Interfaces para análise de padrões - EXPORTADAS
export interface PricePattern {
  type: 'spike' | 'dump' | 'steady' | 'volatile';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
}

export interface VolumePattern {
  type: 'surge' | 'decline' | 'normal';
  change_percentage: number;
  is_suspicious: boolean;
}

export interface InsiderActivity {
  detected: boolean;
  risk_score: number; // 0-100
  indicators: string[];
  recommendation: 'avoid' | 'caution' | 'monitor' | 'safe';
}

export interface TokenAnalysis {
  token: Token;
  price_pattern: PricePattern;
  volume_pattern: VolumePattern;
  insider_activity: InsiderActivity;
  overall_score: number; // 0-100
  migration_status?: 'new' | 'migrating' | 'established';
}

@Injectable()
export class PatternAnalyzerService {
  private readonly logger = new Logger(PatternAnalyzerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * MVP Feature: Analyze Token Data
   * Identify patterns (e.g., sudden price spikes, volume changes)
   */
  async analyzeTokenPatterns(tokenAddress?: string): Promise<TokenAnalysis[]> {
    this.logger.log('🔍 Iniciando análise de padrões de tokens...');

    const tokens = tokenAddress
      ? await this.prisma.token.findMany({ where: { address: tokenAddress } })
      : await this.prisma.token.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 50, // Limitar para performance
        });

    const analyses: TokenAnalysis[] = [];

    for (const token of tokens) {
      const analysis = await this.analyzeToken(token);
      analyses.push(analysis);
    }

    this.logger.log(`✅ Análise completa para ${analyses.length} tokens`);
    return analyses;
  }

  /**
   * Analisa um token individual
   */
  private async analyzeToken(token: Token): Promise<TokenAnalysis> {
    const pricePattern = this.analyzePricePattern(token);
    const volumePattern = this.analyzeVolumePattern(token);
    const insiderActivity = await this.analyzeInsiderActivity(token);

    // Calcular score geral (0-100)
    const overallScore = this.calculateOverallScore(
      pricePattern,
      volumePattern,
      insiderActivity,
    );

    return {
      token,
      price_pattern: pricePattern,
      volume_pattern: volumePattern,
      insider_activity: insiderActivity,
      overall_score: overallScore,
      migration_status: this.determineMigrationStatus(token),
    };
  }

  /**
   * MVP Feature: Identify patterns (sudden price spikes)
   */
  private analyzePricePattern(token: Token): PricePattern {
    const currentPrice = token.priceUsd;

    // Simulação de análise de padrão de preço
    // TODO: Implementar análise histórica real quando tivermos mais dados

    if (currentPrice > 10) {
      return {
        type: 'spike',
        severity: 'high',
        confidence: 85,
        description: `Possível spike de preço detectado: $${currentPrice}`,
      };
    }

    if (currentPrice < 0.001) {
      return {
        type: 'dump',
        severity: 'medium',
        confidence: 70,
        description: `Preço muito baixo detectado: $${currentPrice}`,
      };
    }

    return {
      type: 'steady',
      severity: 'low',
      confidence: 60,
      description: `Preço estável: $${currentPrice}`,
    };
  }

  /**
   * MVP Feature: Analyze volume changes
   */
  private analyzeVolumePattern(token: Token): VolumePattern {
    const volume = token.volume24h;

    // Análise básica de volume
    // TODO: Comparar com volumes históricos

    if (volume > 1000000) {
      return {
        type: 'surge',
        change_percentage: 150, // Simulado
        is_suspicious: volume > 10000000, // Volumes muito altos podem ser suspeitos
      };
    }

    if (volume < 1000) {
      return {
        type: 'decline',
        change_percentage: -80,
        is_suspicious: false,
      };
    }

    return {
      type: 'normal',
      change_percentage: 0,
      is_suspicious: false,
    };
  }

  /**
   * MVP Feature: Detect Insider Tokens
   * Identify suspicious activity (large transactions from small number of wallets)
   */
  private async analyzeInsiderActivity(token: Token): Promise<InsiderActivity> {
    // Simulação de análise de insider trading
    // TODO: Integrar com dados on-chain reais (Helius, Bitquery)

    const indicators: string[] = [];
    let riskScore = 0;

    // Verificar market cap vs volume ratio
    const mcapVolumeRatio = token.marketCap / (token.volume24h || 1);

    if (mcapVolumeRatio < 5) {
      indicators.push('Volume alto comparado ao market cap');
      riskScore += 30;
    }

    if (token.marketCap < 100000) {
      indicators.push('Market cap muito baixo');
      riskScore += 20;
    }

    // Verificar idade do token (aproximação)
    const tokenAge = Date.now() - token.createdAt.getTime();
    const hoursOld = tokenAge / (1000 * 60 * 60);

    if (hoursOld < 1) {
      indicators.push('Token muito novo (menos de 1 hora)');
      riskScore += 40;
    }

    let recommendation: 'avoid' | 'caution' | 'monitor' | 'safe';

    if (riskScore >= 70) {
      recommendation = 'avoid';
    } else if (riskScore >= 40) {
      recommendation = 'caution';
    } else if (riskScore >= 20) {
      recommendation = 'monitor';
    } else {
      recommendation = 'safe';
    }

    return {
      detected: riskScore > 40,
      risk_score: Math.min(riskScore, 100),
      indicators,
      recommendation,
    };
  }

  /**
   * Calcula score geral do token
   */
  private calculateOverallScore(
    pricePattern: PricePattern,
    volumePattern: VolumePattern,
    insiderActivity: InsiderActivity,
  ): number {
    let score = 50; // Base score

    // Ajustar baseado no padrão de preço
    if (pricePattern.type === 'spike') {
      score += 20;
    } else if (pricePattern.type === 'dump') {
      score -= 30;
    }

    // Ajustar baseado no volume
    if (volumePattern.type === 'surge' && !volumePattern.is_suspicious) {
      score += 15;
    } else if (volumePattern.is_suspicious) {
      score -= 25;
    }

    // Ajustar baseado em atividade insider
    score -= insiderActivity.risk_score * 0.5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determina status de migração para Pump.fun
   */
  private determineMigrationStatus(
    token: Token,
  ): 'new' | 'migrating' | 'established' {
    const tokenAge = Date.now() - token.createdAt.getTime();
    const hoursOld = tokenAge / (1000 * 60 * 60);

    if (hoursOld < 1) {
      return 'new';
    } else if (hoursOld < 24) {
      return 'migrating';
    } else {
      return 'established';
    }
  }

  /**
   * MVP Feature: Get high-potential tokens
   * Retorna tokens com score alto e baixo risco
   */
  async getHighPotentialTokens(): Promise<TokenAnalysis[]> {
    const allAnalyses = await this.analyzeTokenPatterns();

    return allAnalyses
      .filter(
        (analysis) =>
          analysis.overall_score >= 70 &&
          analysis.insider_activity.recommendation !== 'avoid',
      )
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10); // Top 10
  }

  /**
   * MVP Feature: Get risky tokens to avoid
   */
  async getRiskyTokens(): Promise<TokenAnalysis[]> {
    const allAnalyses = await this.analyzeTokenPatterns();

    return allAnalyses
      .filter(
        (analysis) =>
          analysis.insider_activity.recommendation === 'avoid' ||
          analysis.overall_score < 30,
      )
      .sort(
        (a, b) => b.insider_activity.risk_score - a.insider_activity.risk_score,
      );
  }
}
