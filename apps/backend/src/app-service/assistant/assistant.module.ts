import { Module, forwardRef } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { GmailModule } from '../gmail/gmail.module';
import { GoogleModule } from '../auth/google.module';
import { AssistantController } from './assistant.controller';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { LlmModule } from '../LLM/llm.module';
import { IntentDetector } from './intent/intent.detector';
import { EmailAgent } from '../agents/email/email.agent';
import { EmailDraftingService } from '../agents/email/email-drafting.service';

@Module({
  imports: [
    LlmModule,
    GmailModule,
    GoogleModule,
    forwardRef(() => TelegramModule),
    forwardRef(() => WhatsappModule),
  ],
  providers: [AssistantService, IntentDetector, EmailAgent, EmailDraftingService],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
