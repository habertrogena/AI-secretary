// import { Injectable } from '@nestjs/common';
// import { LlmService } from 'src/app-service/LLM/llm.service';

// export type AssistantIntent = 'SEND_EMAIL' | 'CREATE_EVENT' | 'UNKNOWN';

// @Injectable()
// export class IntentExtractorService {
//   constructor(private readonly llm: LlmService) {}

//   async extract(text: string): Promise<{
//     intent: AssistantIntent;
//     payload?: any;
//   }> {
//     const system = `
// You extract user intent.
// Return ONLY valid JSON.
// `;

//     const user = `
// Message:
// "${text}"

// JSON format:
// {
//   "intent": "SEND_EMAIL | CREATE_EVENT | UNKNOWN",
//   "payload": {
//     "to": "",
//     "subject": "",
//     "body": ""
//   }
// }
// `;

//     const response = await this.llm.chat(system, user);
//     return JSON.parse(response);
//   }
// }
