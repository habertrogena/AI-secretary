import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { LlmChatMessage } from './llm.types';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async chat(messages: LlmChatMessage[]): Promise<string> {
    try {
      this.logger.debug('Sending request to LLM', {
        model: 'mistralai/mistral-7b-instruct',
        messageCount: messages.length,
        lastUserMessage: messages[messages.length - 1]?.content?.substring(
          0,
          100,
        ),
      });

      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'mistralai/mistral-7b-instruct',
          messages,
          temperature: 0.2,
          max_tokens: 500, // prevent early stop
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = res.data.choices?.[0]?.message?.content ?? '';

      this.logger.log('✅ LLM Response received', {
        length: content.length,
        preview: content.substring(0, 200) || 'No content',
      });

      if (!content.trim()) {
        this.logger.error(
          '❌ LLM returned empty response',
          JSON.stringify(res.data, null, 2),
        );
        return ''; // return empty string for fallback
      }

      return content;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error('❌ LLM API Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      } else {
        this.logger.error('❌ LLM Error', error);
      }
      return ''; // return empty string for fallback
    }
  }
}
