import { Body, Controller, Get, Post } from '@nestjs/common';
import { GmailService } from './gmail.service';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Post('test/send-email')
  async testSendEmail(
    @Body()
    body: {
      userId: string;
      to: string;
      subject: string;
      body: string;
    },
  ) {
    await this.gmailService.sendEmail(body.userId, {
      to: body.to,
      subject: body.subject,
      body: body.body,
    });

    return { success: true };
  }

  // Add a simple test route to verify
  @Get('test')
  test() {
    return { message: 'Gmail controller is working' };
  }

  // Then test: http://localhost:3000/gmail/test
}
