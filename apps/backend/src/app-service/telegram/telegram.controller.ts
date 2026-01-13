import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  private logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  // Telegram webhook endpoint (if using webhook mode)
  @Post('webhook')
  async receiveWebhook(@Body() update: any) {
    this.logger.log('=== Telegram Webhook Received ===');
    this.logger.log(`Update: ${JSON.stringify(update, null, 2)}`);

    try {
      await this.telegramService.handleWebhookUpdate(update);
      this.logger.log('✅ Webhook processed successfully');
    } catch (error) {
      this.logger.error('❌ Error processing webhook', error);
    }

    return { status: 'success' };
  }
}

