import { Injectable, Logger } from '@nestjs/common';
import { AssistantIntent } from '../assistant.types';
import { LlmService } from 'src/app-service/LLM/llm.service';

@Injectable()
export class IntentDetector {
  private readonly logger = new Logger(IntentDetector.name);

  constructor(private readonly llm: LlmService) {}

  async detect(text: string): Promise<{
    intent: AssistantIntent[];
    payload?: any;
    requiresGoogle?: boolean;
  }> {
    try {
      this.logger.log(
        `🔍 Detecting intent for message: "${text.substring(0, 100)}"`,
      );

      const response = await this.llm.chat([
        {
          role: 'system',
          content: `
You are an intent detection assistant. 
You MUST return ONLY valid JSON with keys:
{
  "intent": ["SEND_EMAIL", "MANAGE_TASKS", "UPDATE_CALENDAR", "UNKNOWN"],
  "payload": { "to": "", "subject": "", "body": "" }
}
If multiple intents are present, return them as an array. No extra text.
          `,
        },
        {
          role: 'user',
          content: `User message: "${text}"\nReturn JSON as instructed above.`,
        },
      ]);

      if (!response.trim()) {
        this.logger.warn('⚠️ Empty LLM response, defaulting to UNKNOWN');
        return { intent: [AssistantIntent.UNKNOWN] };
      }

      // Extract first JSON object
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('❌ No JSON found in LLM response:', response);
        return { intent: [AssistantIntent.UNKNOWN] };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Normalize intents to array
      let intents: AssistantIntent[] = [];
      if (Array.isArray(parsed.intent)) {
        intents = parsed.intent;
      } else if (typeof parsed.intent === 'string') {
        intents = parsed.intent
          .split('|')
          .map((i: string) => i.trim() as AssistantIntent);
      } else {
        intents = [AssistantIntent.UNKNOWN];
      }

      // Determine if Google connection is required
      const requiresGoogle = intents.some((i) =>
        [
          AssistantIntent.SEND_EMAIL,
          AssistantIntent.MANAGE_TASKS,
          AssistantIntent.UPDATE_CALENDAR,
        ].includes(i),
      );

      this.logger.log('✅ Detected intent', {
        intents,
        payload: parsed.payload,
        requiresGoogle,
      });

      return { intent: intents, payload: parsed.payload, requiresGoogle };
    } catch (err: any) {
      this.logger.error('❌ Failed to parse LLM intent', {
        error: err.message,
        stack: err.stack,
      });
      return { intent: [AssistantIntent.UNKNOWN] };
    }
  }
}
