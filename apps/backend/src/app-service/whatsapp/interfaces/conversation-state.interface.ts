// whatsapp/interfaces/conversation-state.interface.ts

export type ConversationStep = 'AWAITING_NAME' | 'AWAITING_EMAIL' | 'COMPLETED';

export interface TempUserData {
  fullName?: string;
  email?: string;
  phoneNumber: string;
}

export interface ConversationState {
  step: ConversationStep;
  tempUserData: TempUserData;
}
