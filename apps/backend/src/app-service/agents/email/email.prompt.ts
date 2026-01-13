export const EMAIL_CONFIRMATION_PROMPT = (draft: {
  to?: string;
  subject?: string;
  body?: string;
}) => `
✉️ *Email Draft*

To: ${draft.to ?? '—'}
Subject: ${draft.subject ?? '(No subject)'}

${draft.body ?? ''}

Reply with:
✅ Send
✏️ Edit
❌ Cancel
`;
