import { google } from 'googleapis';
import { GoogleOAuthService } from '../auth/oauth/google-oauth.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GmailService {
  constructor(private readonly googleOAuth: GoogleOAuthService) {}

  async sendEmail(
    userId: string,
    email: { to: string; subject: string; body: string },
  ) {
    const authClient = await this.googleOAuth.getAuthorizedClient(userId);

    const gmail = google.gmail({
      version: 'v1',
      auth: authClient,
    });

    const raw = this.createRawEmail(email);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
  }

  private createRawEmail(email: {
    to: string;
    subject: string;
    body: string;
  }): string {
    const message = [
      `To: ${email.to}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `Subject: ${email.subject}`,
      '',
      email.body,
    ].join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
