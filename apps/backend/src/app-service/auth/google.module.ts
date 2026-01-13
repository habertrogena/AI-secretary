import { forwardRef, Module } from '@nestjs/common';
import { PrismaService } from 'src/server-common/prisma/prisma.service';
import { GoogleOAuthController } from './oauth/google-oauth.controller';
import { GoogleOAuthService } from './oauth/google-oauth.service';
import { GoogleTokenService } from './google-token.service';
import { AssistantModule } from '../assistant/assistant.module';

@Module({
  imports: [forwardRef(() => AssistantModule)],
  controllers: [GoogleOAuthController],
  providers: [GoogleOAuthService, PrismaService, GoogleTokenService],
  exports: [GoogleOAuthService, GoogleTokenService],
})
export class GoogleModule {}
