import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { AssistantService } from '../assistant/assistant.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot!: Telegraf;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @Inject(forwardRef(() => AssistantService))
    private readonly assistantService: AssistantService,
  ) {}

  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webhook = process.env.TELEGRAM_WEBHOOK_URL;

    if (!token || !webhook) {
      this.logger.warn('Telegram not configured');
      return;
    }

    this.bot = new Telegraf(token);

    // Listen to text messages
    this.bot.on('text', async (ctx: Context) => {
      try {
        if (!ctx.from) return;

        const message = ctx.message;
        if (
          !message ||
          !('text' in message) ||
          typeof message.text !== 'string'
        ) {
          return;
        }

        const result = await this.assistantService.processMessage({
          channel: 'telegram',
          channelUserId: String(ctx.from.id),
          text: message.text,
          userName: ctx.from.first_name,
        });

        // AssistantService returns reply; TelegramService sends it
        if (result?.reply) {
          const text =
            typeof result.reply === 'string'
              ? result.reply
              : (result.reply as { text: string }).text;
          await ctx.reply(text);
        }
      } catch (error) {
        this.logger.error('Telegram message handling failed', error as Error);
        await ctx.reply(
          '⚠️ Something went wrong. Please try again in a moment.',
        );
      }
    });

    // Set webhook with error handling - don't crash app if it fails
    try {
      await this.bot.telegram.setWebhook(webhook);
      this.logger.log(`✅ Telegram webhook set: ${webhook}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `⚠️ Failed to set Telegram webhook: ${errorMessage}. The app will continue, but Telegram webhook may not work.`,
      );
      this.logger.warn(
        'You can manually set the webhook later or check your network connection.',
      );
    }
  }

  /**
   * Used by AssistantService to send messages
   * (e.g. after OAuth completion)
   */
  async sendMessage(
    telegramId: string,
    message: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    },
  ) {
    if (!this.bot) {
      this.logger.warn('Bot not initialized, cannot send message');
      return;
    }

    try {
      if (options?.parse_mode) {
        await this.bot.telegram.sendMessage(telegramId, message, {
          parse_mode: options.parse_mode,
        });
      } else {
        await this.bot.telegram.sendMessage(telegramId, message);
      }
    } catch (error) {
      const err =
        error instanceof Error ? error.message : 'Unknown Telegram error';
      this.logger.error(`Failed to send Telegram message: ${err}`);
    }
  }

  /**
   * Called by TelegramController webhook endpoint
   */
  async handleWebhookUpdate(update: Update) {
    if (!this.bot) {
      this.logger.warn('Bot not initialized, cannot handle webhook update');
      return;
    }

    await this.bot.handleUpdate(update);
  }
}
