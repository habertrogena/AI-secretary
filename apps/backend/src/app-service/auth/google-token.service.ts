import { Injectable, UnauthorizedException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from 'src/server-common/prisma/prisma.service';

@Injectable()
export class GoogleTokenService {
  private oauthClient;

  constructor(private prisma: PrismaService) {
    this.oauthClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URL,
    );
  }

  /**
   * Always returns a VALID access token
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.googleRefreshToken) {
      throw new UnauthorizedException('Google account not connected');
    }

    // Token still valid
    if (
      user.googleAccessToken &&
      user.googleTokenExpiry &&
      user.googleTokenExpiry > new Date()
    ) {
      return user.googleAccessToken;
    }

    // Token expired → refresh
    return this.refreshAccessToken(user);
  }

  private async refreshAccessToken(user: any): Promise<string> {
    this.oauthClient.setCredentials({
      refresh_token: user.googleRefreshToken,
    });

    const { credentials } = await this.oauthClient.refreshAccessToken();

    if (!credentials.access_token) {
      throw new UnauthorizedException('Failed to refresh Google token');
    }

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: credentials.access_token,
        googleTokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      },
    });

    return credentials.access_token;
  }
}
