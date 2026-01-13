import { AssistantIntent } from './assistant.types';

export interface AgentContext {
  activeIntent: AssistantIntent | null;
  stage: 'COLLECTING' | 'CONFIRMING' | null;
  draft: {
    to?: string;
    subject?: string;
    body?: string;
  };
}
