import { Injectable, Logger } from '@nestjs/common';
import { GmailService } from 'src/app-service/gmail/gmail.service';
import { SendEmailPayload } from './email.types';
import { AssistantEmailReply } from 'src/app-service/assistant/assistant.types';
import { EmailDraftingService } from './email-drafting.service';

@Injectable()
export class EmailAgent {
  private readonly logger = new Logger(EmailAgent.name);

  constructor(
    private readonly gmail: GmailService,
    private readonly emailDraftingService: EmailDraftingService,
  ) {}

  async handle(
    draft: Partial<SendEmailPayload>,
    message: string,
    userId: string,
  ): Promise<{
    reply: AssistantEmailReply;
    updatedDraft: Partial<SendEmailPayload>;
    done: boolean;
  }> {
    const text = message.trim();
    const lower = text.toLowerCase();
    let updatedDraft = { ...draft };

    // 1️⃣ CANCEL
    if (lower === 'cancel') {
      return {
        reply: { text: '❌ Email cancelled.' },
        updatedDraft: {},
        done: true,
      };
    }

    // 2️⃣ CONFIRM
    if (
      lower === 'confirm' &&
      updatedDraft.to &&
      updatedDraft.subject &&
      updatedDraft.body
    ) {
      await this.gmail.sendEmail(userId, {
        to: updatedDraft.to,
        subject: updatedDraft.subject,
        body: updatedDraft.body,
      });

      return {
        reply: { text: '✅ Email sent successfully!' },
        updatedDraft: {},
        done: true,
      };
    }

    // 3️⃣ EDIT / REWRITE / TONE
    const editCommand = this.parseEditCommand(text);
    if (editCommand && updatedDraft.subject && updatedDraft.body) {
      if (editCommand.type === 'EDIT_SUBJECT')
        updatedDraft.subject = editCommand.value;
      if (editCommand.type === 'EDIT_BODY')
        updatedDraft.body = editCommand.value;
      if (editCommand.type === 'REWRITE' || editCommand.type === 'TONE') {
        const rewritten = await this.emailDraftingService.rewriteEmail(
          updatedDraft as SendEmailPayload,
          editCommand.tone,
        );
        updatedDraft = { ...updatedDraft, ...rewritten };
      }

      return this.preview(updatedDraft);
    }

    // 4️⃣ LLM AUTO-DRAFT if draft empty
    if (!updatedDraft.to && !updatedDraft.subject && !updatedDraft.body) {
      const autoDraft = await this.emailDraftingService.draftFromText(text);

      if (autoDraft.to || autoDraft.subject || autoDraft.body) {
        updatedDraft = { ...updatedDraft, ...autoDraft };
        return this.preview(updatedDraft);
      }
    }

    // 5️⃣ COLLECT RECIPIENT
    if (!updatedDraft.to) {
      updatedDraft.to = text;
      return {
        reply: { text: 'Got it 👍 What is the subject and body of the email?' },
        updatedDraft,
        done: false,
      };
    }

    // 6️⃣ COLLECT SUBJECT/BODY manually
    if (!updatedDraft.subject || !updatedDraft.body) {
      const lines = text.split('\n');
      updatedDraft.subject = lines[0];
      updatedDraft.body = lines.slice(1).join('\n');
      return this.preview(updatedDraft);
    }

    // 7️⃣ FALLBACK
    return {
      reply: {
        text: 'Please reply *CONFIRM* to send, *CANCEL* to abort, or edit the email.',
      },
      updatedDraft,
      done: false,
    };
  }

  // =====================================================
  // Helpers
  // =====================================================

  private parseEditCommand(text: string) {
    const lower = text.toLowerCase();
    if (lower.startsWith('edit subject:'))
      return { type: 'EDIT_SUBJECT', value: text.slice(13).trim() };
    if (lower.startsWith('edit body:'))
      return { type: 'EDIT_BODY', value: text.slice(10).trim() };
    if (lower.startsWith('rewrite'))
      return { type: 'REWRITE', tone: lower.replace('rewrite', '').trim() };
    if (
      lower.includes('formal') ||
      lower.includes('professional') ||
      lower.includes('casual')
    )
      return { type: 'TONE', tone: lower };
    return null;
  }

  private preview(draft: Partial<SendEmailPayload>) {
    return {
      reply: {
        text: `📨 Email Preview

To: ${draft.to}
Subject: ${draft.subject}

${draft.body}

Reply *CONFIRM* to send, *CANCEL* to abort, or use *EDIT SUBJECT:* / *EDIT BODY:* / *REWRITE* / *TONE* to modify.`,
        meta: { requiresConfirmation: true },
      },
      updatedDraft: draft,
      done: false,
    };
  }

  async draftFromText(text: string, tone?: string) {
    return await this.emailDraftingService.draftFromText(text, tone);
  }
}
