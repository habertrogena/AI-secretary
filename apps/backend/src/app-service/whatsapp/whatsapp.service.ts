import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { AssistantService } from '../assistant/assistant.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @Inject(forwardRef(() => AssistantService))
    private readonly assistantService: AssistantService,
  ) {}

  async handleWebhook(payload: any) {
    const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg || msg.type !== 'text') return;

    const phone = msg.from;
    const text = msg.text.body;

    await this.assistantService.processMessage({
      channel: 'whatsapp',
      channelUserId: phone,
      text,
      userName: undefined, // optional
    });
  }

  async sendMessage(to: string, message: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !token) {
      this.logger.error('WhatsApp credentials missing');
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message: ${err.message}`);
    }
  }
}
