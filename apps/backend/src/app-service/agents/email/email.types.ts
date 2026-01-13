export interface EmailDraft {
  to?: string;
  subject?: string;
  body?: string;
}

export interface SendEmailPayload {
  to?: string;
  subject?: string;
  body?: string;
  confirmed?: boolean;
}
