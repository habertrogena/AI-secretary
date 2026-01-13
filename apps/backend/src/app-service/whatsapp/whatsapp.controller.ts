import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Logger,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import type { Response } from 'express';

@Controller('whatsapp')
export class WhatsappController {
  private logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  // WhatsApp webhook verification
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      this.logger.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  // WhatsApp webhook for incoming messages
  @Post('webhook')
  async receiveMessage(@Body() payload: any) {
    this.logger.log('=== WhatsApp Webhook Received ===');
    this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      await this.whatsappService.handleWebhook(payload);
      this.logger.log('✅ Webhook processed successfully');
    } catch (error) {
      this.logger.error('❌ Error processing webhook', error);
    }

    return { status: 'success' };
  }
}
