import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // This ensures that we connect to the database when the application starts.
  async onModuleInit(): Promise<void> {
    await (this.$connect as () => Promise<void>)();
  }
}
