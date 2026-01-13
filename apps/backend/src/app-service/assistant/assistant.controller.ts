import { Controller, Body } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  // @Post('message')
  // async handleMessage(
  //   @Body()
  //   // body: {
  //   //   channel: 'whatsapp' | 'telegram';
  //   //   userId: string;
  //   //   message: string;
  //   // },
  // ) {
  //   // return this.assistantService.processMessage(
  //   //   body.channel,
  //   //   body.userId,
  //   //   body.message,
  //   // );
  // }
}
