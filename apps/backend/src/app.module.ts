import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './server-common/common.module';
import { AppServiceModule } from './app-service/app-service.module';

@Module({
  imports: [CommonModule, AppServiceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
