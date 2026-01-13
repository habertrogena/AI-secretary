export interface LlmChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LLMResponse {
  content: string;
}
