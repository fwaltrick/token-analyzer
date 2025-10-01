import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { PatternAnalyzerService } from './pattern-analyzer.service';
import { AnalysisController } from './analysis.controller';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [AnalysisController],
  providers: [PatternAnalyzerService],
  exports: [PatternAnalyzerService],
})
export class AnalysisModule {}
