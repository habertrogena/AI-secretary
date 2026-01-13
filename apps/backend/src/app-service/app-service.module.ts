import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { TelegramModule } from './telegram/telegram.module';
import { GoogleModule } from './auth/google.module';
import { GmailModule } from './gmail/gmail.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    WhatsappModule,
    TelegramModule,
    GoogleModule,
    GmailModule,
    AssistantModule,
  ],
  providers: [],
  exports: [WhatsappModule, TelegramModule],
})
export class AppServiceModule {}
