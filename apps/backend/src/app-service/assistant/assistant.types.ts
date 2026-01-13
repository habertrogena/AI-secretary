export type AssistantChannel = 'whatsapp' | 'telegram';

export interface AssistantMessage {
  channel: AssistantChannel;
  channelUserId: string;
  text: string;
  userName?: string;
}

export enum ConversationState {
  IDLE = 'IDLE',
  WAITING_FOR_GOOGLE = 'WAITING_FOR_GOOGLE',
  SENDING_EMAIL = 'SENDING_EMAIL',
  MANAGING_TASKS = 'MANAGING_TASKS',
  UPDATING_CALENDAR = 'UPDATING_CALENDAR',
}

export enum UserIntent {
  NONE = 'NONE',
  GOOGLE_ACTION = 'GOOGLE_ACTION',
}

export enum AssistantIntent {
  SEND_EMAIL = 'SEND_EMAIL',
  MANAGE_TASKS = 'MANAGE_TASKS',
  UPDATE_CALENDAR = 'UPDATE_CALENDAR',
  CREATE_TASK = 'CREATE_TASK',
  DELETE_TASK = 'DELETE_TASK',
  COMPLETE_TASK = 'COMPLETE_TASK',
  REPEAT_TASK = 'REPEAT_TASK',

  UNKNOWN = 'UNKNOWN',
}

export interface AssistantReply {
  reply: string;
}

export interface DetectedIntent {
  intent: AssistantIntent;
  requiresGoogle: boolean;
  payload?: any;
}

export interface AssistantEmailReply {
  text: string;
  meta?: {
    preview?: boolean;
    requiresConfirmation?: boolean;
    sent?: boolean;
    cancelled?: boolean;
  };
}

export enum EmailStage {
  COLLECTING_EMAIL = 'COLLECTING_EMAIL',
  CONFIRMING_EMAIL = 'CONFIRMING_EMAIL',
  SENDING_EMAIL = 'SENDING_EMAIL',
  SENT_EMAIL = 'SENT_EMAIL',
  ERROR = 'ERROR',
}
