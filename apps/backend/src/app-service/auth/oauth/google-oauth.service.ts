import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from 'src/server-common/prisma/prisma.service';

@Injectable()
export class GoogleOAuthService implements OnModuleInit {
  private readonly logger = new Logger(GoogleOAuthService.name);

  private oauthClient: any = null;

  // 👇 cache env values once
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly redirectUrl = process.env.GOOGLE_OAUTH_REDIRECT_URL;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('=== Google OAuth Service Initialization ===');

    this.logger.log(
      `GOOGLE_CLIENT_ID: ${
        this.clientId ? `Set (${this.clientId.substring(0, 20)}...)` : 'Not set'
      }`,
    );

    this.logger.log(
      `GOOGLE_CLIENT_SECRET: ${
        this.clientSecret ? 'Set (***hidden***)' : 'Not set'
      }`,
    );

    this.logger.log(
      `GOOGLE_OAUTH_REDIRECT_URL: ${this.redirectUrl || 'Not set'}`,
    );

    if (!this.clientId || !this.clientSecret || !this.redirectUrl) {
      this.logger.error(
        '❌ Google OAuth credentials are missing. Google OAuth will not work.',
      );
    } else {
      this.logger.log('✅ Google OAuth credentials loaded successfully');
    }

    this.logger.log('=== End Google OAuth Service Initialization ===');
  }

  private getOAuthClient() {
    if (this.oauthClient) {
      return this.oauthClient;
    }

    if (!this.clientId || !this.clientSecret || !this.redirectUrl) {
      throw new Error('Google OAuth credentials are not configured');
    }

    this.oauthClient = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUrl,
    );

    return this.oauthClient;
  }

  generateAuthUrl(userId: string) {
    return this.getOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/tasks',
      ],
      state: userId,
    });
  }

  /** Check if the user has Google connected */
  async isGoogleConnected(userId: string): Promise<boolean> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true },
    });

    return Boolean(user?.googleAccessToken);
  }

  async handleCallback(code: string, userId: string) {
    const { tokens } = await this.getOAuthClient().getToken(code);

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });
  }

  async getAuthorizedClient(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    if (!user?.googleAccessToken) {
      throw new Error('Google account not connected');
    }

    const client = this.getOAuthClient();

    client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry?.getTime(),
    });

    /**
     * Optional but VERY important:
     * Automatically persist refreshed tokens
     */
    client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await this.prisma.client.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: tokens.access_token,
            googleTokenExpiry: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : undefined,
            googleRefreshToken: tokens.refresh_token ?? user.googleRefreshToken,
          },
        });
      }
    });

    return client;
  }
}
