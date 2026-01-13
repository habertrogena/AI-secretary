import { Injectable, Logger } from '@nestjs/common';
import { SendEmailPayload } from './email.types';
import { LlmService } from 'src/app-service/LLM/llm.service';

@Injectable()
export class EmailDraftingService {
  private readonly logger = new Logger(EmailDraftingService.name);

  constructor(private readonly llm: LlmService) {}

  async draftFromText(
    text: string,
    tone?: string,
  ): Promise<Partial<SendEmailPayload>> {
    this.logger.log('🧠 Drafting email using LLM');

    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/,
    );

    const prompt = `
You are a smart email assistant. Draft an email based on the user's message below.
User message: "${text}"
Tone: ${tone ?? 'neutral'}

Return ONLY valid JSON with keys:
{
  "to": "recipient email",
  "subject": "email subject",
  "body": "email body"
}
If any field is missing, leave it empty.
`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    try {
      const json = JSON.parse(response.replace(/```json|```/g, '').trim());
      return {
        to: json.to ?? emailMatch?.[0] ?? '',
        subject: json.subject ?? 'No Subject',
        body: json.body ?? '',
      };
    } catch (e) {
      this.logger.warn('LLM response could not be parsed, falling back', e);
      return {
        to: emailMatch?.[0] ?? '',
        subject: 'Meeting Update',
        body: `Hi,

I wanted to let you know that the meeting has been postponed.

I’ll share the new date soon.

Best regards`,
      };
    }
  }

  async rewriteEmail(
    draft: SendEmailPayload,
    tone?: string,
  ): Promise<Pick<SendEmailPayload, 'subject' | 'body'>> {
    this.logger.log(`🔁 Rewriting email with tone: ${tone ?? 'neutral'}`);

    const prompt = `
Rewrite the following email in a ${tone ?? 'neutral'} tone:

Subject: ${draft.subject}
Body: ${draft.body}

Return JSON with:
{
  "subject": "rewritten subject",
  "body": "rewritten body"
}
`;

    const response = await this.llm.chat([{ role: 'user', content: prompt }]);

    try {
      const json = JSON.parse(response.replace(/```json|```/g, '').trim());
      return {
        subject: json.subject ?? draft.subject,
        body: json.body ?? draft.body,
      };
    } catch (e) {
      this.logger.warn('LLM rewrite failed, using original draft', e);
      return { subject: draft.subject, body: draft.body };
    }
  }
}
