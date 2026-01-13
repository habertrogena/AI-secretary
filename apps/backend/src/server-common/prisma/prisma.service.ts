import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { prisma } from '@secretary/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await prisma.$connect();
      this.logger.log('Successfully connected to the database');
    } catch (error) {
      this.logger.error(
        'Database connection failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // fail-fast if cannot connect
    }
  }

  async onModuleDestroy() {
    try {
      await prisma.$disconnect();
      this.logger.log('Disconnected from the database');
    } catch (error) {
      this.logger.error(
        'Error during DB disconnect',
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw here: allow graceful shutdown even if disconnect fails
    }
  }

  get client() {
    return prisma;
  }
}
