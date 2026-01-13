import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GoogleOAuthService } from './google-oauth.service';
import { AssistantService } from 'src/app-service/assistant/assistant.service';

@Controller('google/oauth')
export class GoogleOAuthController {
  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly assistantService: AssistantService,
  ) {}

  @Get('start')
  startOAuth(
    @Query('userId') userId: string | undefined,
    @Res() res: Response,
  ) {
    if (!userId) return res.status(400).send('userId is required');
    const url = this.googleOAuthService.generateAuthUrl(userId);
    return res.redirect(url);
  }

  @Get('callback')
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') userId: string | undefined,
    @Res() res: Response,
  ) {
    if (!code || !userId) return res.status(400).send('Missing code or userId');

    try {
      await this.googleOAuthService.handleCallback(code, userId);
      await this.assistantService.onGoogleConnected(userId);

      return res.send(`
        <h2>✅ Google Connected</h2>
        <p>You can now return to Msaidizi. You may close this tab.</p>
      `);
    } catch {
      return res
        .status(500)
        .send(`<h2>❌ Error connecting Google</h2><p>Try again later.</p>`);
    }
  }
}
