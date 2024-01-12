import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DownloaderModule } from './downloader/downloader.module';

@Module({
  imports: [DownloaderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
