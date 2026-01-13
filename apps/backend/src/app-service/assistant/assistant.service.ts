import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/server-common/prisma/prisma.service';
import { GoogleOAuthService } from '../auth/oauth/google-oauth.service';
import { AssistantMessage, AssistantIntent } from './assistant.types';
import { ConversationState, User, Prisma } from '@secretary/db';
import { IntentDetector } from './intent/intent.detector';
import { TelegramService } from '../telegram/telegram.service';
import { EmailAgent } from '../agents/email/email.agent';
import { AgentContext } from './agent-context.type';
import { SendEmailPayload } from '../agents/email/email.types';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAuthService: GoogleOAuthService,
    private readonly intentDetector: IntentDetector,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
    private readonly emailAgent: EmailAgent,
  ) {}

  // =====================================================
  // ENTRY POINT
  // =====================================================
  async processMessage(msg: AssistantMessage) {
    const text = msg.text.trim();

    // 🔥 GLOBAL COMMANDS
    if (text.toLowerCase() === '/start' || text.toLowerCase() === 'start') {
      const user = await this.findOrCreateUser(msg);

      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          agentContext: Prisma.JsonNull,
          conversationState: ConversationState.IDLE,
        },
      });

      return {
        reply: `Hello ${user.name ?? 'there'} 👋
Welcome to Msaidizi.
How may I help you today?`,
      };
    }

    if (text.toLowerCase() === '/help') {
      return {
        reply: `I can help you:
• Send emails
• Manage tasks
• Update your calendar

Just tell me what you want to do 😊`,
      };
    }

    const user = await this.findOrCreateUser(msg);
    const agentContext = this.getAgentContext(user);

    // 🔒 ACTIVE AGENT SHORT-CIRCUIT
    if (agentContext?.activeIntent === AssistantIntent.SEND_EMAIL) {
      return this.handleEmailAgent(user, text);
    }

    // 🧭 NORMAL CONVERSATION
    switch (user.conversationState) {
      case ConversationState.IDLE:
        return this.handleIdle(user, text);

      case ConversationState.WAITING_FOR_INPUT:
        return { reply: 'Please complete the previous step first.' };

      case ConversationState.PROCESSING:
        return { reply: '⏳ Still working on your last request…' };

      default:
        return { reply: 'How can I help you today?' };
    }
  }

  // =====================================================
  // IDLE STATE
  // =====================================================
  private async handleIdle(user: User, text: string) {
    if (this.isGreeting(text)) {
      return {
        reply: `Hello ${user.name ?? 'there'} 👋
Welcome to Msaidizi.
How may I help you today?`,
      };
    }

    const detected = await this.intentDetector.detect(text);

    // Check Google connection if required
    if (detected.requiresGoogle) {
      const connected = await this.googleAuthService.isGoogleConnected(user.id);
      if (!connected) {
        await this.updateState(user, ConversationState.WAITING_FOR_INPUT);
        const link = this.googleAuthService.generateAuthUrl(user.id);
        return {
          reply: `To continue, please connect your Google account 👇\n${link}`,
        };
      }
    }

    // Handle detected intents
    for (const intent of detected.intent) {
      switch (intent) {
        case AssistantIntent.SEND_EMAIL: {
          this.logger.log('📧 SEND_EMAIL intent detected');

          const draftPayload = detected.payload ?? {};

          // Draft email using LLM (merge existing payload if any)
          const llmDraft: Partial<SendEmailPayload> =
            await this.emailAgent.draftFromText(text, draftPayload);

          // Update user context to track active email agent
          await this.prisma.client.user.update({
            where: { id: user.id },
            data: {
              conversationState: ConversationState.PROCESSING,
              agentContext: {
                activeIntent: AssistantIntent.SEND_EMAIL,
                stage: 'COLLECTING',
                draft: llmDraft,
              } as Prisma.InputJsonValue,
            },
          });

          // Send email preview immediately
          await this.sendReply(user, {
            text: `📨 Email Preview

To: ${llmDraft.to ?? ''}
Subject: ${llmDraft.subject ?? ''}

${llmDraft.body ?? ''}

Reply *CONFIRM* to send or *CANCEL* to abort or *EDIT* to modify.`,
          });
          await this.prisma.client.user.update({
            where: { id: user.id },
            data: {
              conversationState: ConversationState.PROCESSING,
              agentContext: {
                activeIntent: AssistantIntent.SEND_EMAIL,
                stage: 'COLLECTING',
                draft: draftPayload,
              } as Prisma.InputJsonValue,
            },
          });
          return null;
        }

        case AssistantIntent.MANAGE_TASKS:
          return { reply: 'Task management is coming next 🚧' };

        case AssistantIntent.UPDATE_CALENDAR:
          return { reply: 'Calendar updates are coming soon 🚧' };
      }
    }

    return null;
  }

  // =====================================================
  // EMAIL AGENT HANDLER
  // =====================================================
  private async handleEmailAgent(user: User, text: string) {
    this.logger.log('📧 Resuming EmailAgent');

    const agentContext = this.getAgentContext(user);
    if (!agentContext) {
      await this.resetUserContext(user);
      return {
        reply: 'Sorry, I lost track of your email request. Please start over.',
      };
    }

    let draft = (agentContext.draft ?? {}) as Partial<SendEmailPayload>;
    // Updated stage type to include EDITING
    let stage: 'COLLECTING' | 'CONFIRMING' | 'EDITING' =
      (agentContext.stage as 'COLLECTING' | 'CONFIRMING' | 'EDITING') ??
      'COLLECTING';

    const lower = text.toLowerCase().trim();

    // -------------------------
    // CANCEL
    // -------------------------
    if (lower === 'cancel') {
      await this.sendReply(user, { text: '❌ Email cancelled.' });
      await this.resetUserContext(user);
      return null;
    }

    // -------------------------
    // CONFIRM
    // -------------------------
    if (lower === 'confirm' && draft.to && draft.subject && draft.body) {
      // Call emailAgent.handle to send email
      const result = await this.emailAgent.handle(draft, 'confirm', user.id);

      if (result?.reply) {
        const replyText =
          typeof result.reply === 'string' ? result.reply : result.reply.text;
        await this.sendReply(user, { text: replyText });
      }

      await this.resetUserContext(user);
      return null;
    }

    // -------------------------
    // EDIT
    // -------------------------
    if (lower === 'edit') {
      stage = 'EDITING';
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          agentContext: { ...agentContext, stage } as Prisma.InputJsonValue,
        },
      });

      await this.sendReply(user, {
        text: `✏️ You can now edit the email.
Send me the updated content in the format:

To: [recipient]
Subject: [subject]

[body]`,
      });
      return null;
    }

    // -------------------------
    // APPLY EDITED EMAIL
    // -------------------------
    if (stage === 'EDITING') {
      const updatedDraft = this.parseEditedEmail(text, draft);
      draft = { ...draft, ...updatedDraft };

      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          agentContext: { ...agentContext, draft } as Prisma.InputJsonValue,
        },
      });

      await this.sendReply(user, {
        text: `📨 Updated Email Preview

To: ${draft.to ?? ''}
Subject: ${draft.subject ?? ''}

${draft.body ?? ''}

Reply *CONFIRM* to send, *CANCEL* to abort, or *EDIT* to modify again.`,
      });

      return null;
    }

    // -------------------------
    // DEFAULT HANDLER: let emailAgent process other edits / rewrite / tone
    // -------------------------
    const result = await this.emailAgent.handle(draft, text, user.id);

    if (result?.reply) {
      const replyText =
        typeof result.reply === 'string' ? result.reply : result.reply.text;
      await this.sendReply(user, { text: replyText });
    }

    // Update agent context
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        agentContext: result.done
          ? Prisma.JsonNull
          : ({
              activeIntent: AssistantIntent.SEND_EMAIL,
              stage: 'COLLECTING',
              draft: result.updatedDraft,
            } as Prisma.InputJsonValue),
        conversationState: result.done
          ? ConversationState.IDLE
          : ConversationState.PROCESSING,
      },
    });

    return null;
  }

  // =====================================================
  // GOOGLE CALLBACK
  // =====================================================
  async onGoogleConnected(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;

    await this.updateState(user, ConversationState.IDLE);

    const message = `✅ Google account connected successfully!

You can now:
• Send emails
• Manage tasks
• Update your calendar

What would you like to do next?`;

    if (user.phoneNumber.startsWith('telegram:')) {
      const telegramId = user.phoneNumber.replace('telegram:', '');
      await this.telegramService.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
      });
    }

    return { reply: message };
  }

  // =====================================================
  // HELPERS
  // =====================================================
  private async findOrCreateUser(msg: AssistantMessage): Promise<User> {
    const phoneNumber =
      msg.channel === 'telegram'
        ? `telegram:${msg.channelUserId}`
        : msg.channelUserId.startsWith('+')
          ? msg.channelUserId
          : `+${msg.channelUserId}`;

    let user = await this.prisma.client.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await this.prisma.client.user.create({
        data: {
          phoneNumber,
          name: msg.userName ?? 'there',
          conversationState: ConversationState.IDLE,
          agentContext: Prisma.JsonNull,
        },
      });
    }

    return user;
  }

  private async sendReply(user: User, reply: { text: string }) {
    if (user.phoneNumber.startsWith('telegram:')) {
      const telegramId = user.phoneNumber.replace('telegram:', '');
      await this.telegramService.sendMessage(telegramId, reply.text, {
        parse_mode: 'Markdown',
      });
    }
  }

  private async updateState(user: User, state: ConversationState) {
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { conversationState: state },
    });
  }

  private getAgentContext(user: User): AgentContext | null {
    if (!user.agentContext || typeof user.agentContext !== 'object')
      return null;
    return user.agentContext as unknown as AgentContext;
  }

  private isGreeting(text: string) {
    return ['hi', 'hello', 'hey', 'habari', 'niaje'].some((g) =>
      text.toLowerCase().includes(g),
    );
  }

  private parseEditedEmail(
    text: string,
    draft: Partial<SendEmailPayload>,
  ): Partial<SendEmailPayload> {
    const lines = text.split('\n');
    let to = draft.to;
    let subject = draft.subject;
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().startsWith('to:')) {
        to = line.slice(3).trim();
      } else if (line.toLowerCase().startsWith('subject:')) {
        subject = line.slice(8).trim();
      } else {
        bodyLines.push(line);
      }
    }

    return {
      to,
      subject,
      body: bodyLines.join('\n').trim(),
    };
  }

  private async resetUserContext(user: User) {
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        agentContext: Prisma.JsonNull,
        conversationState: ConversationState.IDLE,
      },
    });
  }
}
