import { Module } from '@nestjs/common';
import { TokenDataController } from './token-data.controller';
import { TokenDataService } from './token-data.service';
import { HttpModule } from '@nestjs/axios'; // <-- Add this back

@Module({
  imports: [HttpModule],
  controllers: [TokenDataController],
  providers: [TokenDataService],
  exports: [TokenDataService],
})
export class TokenDataModule {}
