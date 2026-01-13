import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { AssistantModule } from '../assistant/assistant.module';

@Module({
  imports: [forwardRef(() => AssistantModule)],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule implements OnModuleInit {
  constructor(private telegramService: TelegramService) {}

  async onModuleInit() {
    // Bot initialization is handled in TelegramService.onModuleInit
  }
}
