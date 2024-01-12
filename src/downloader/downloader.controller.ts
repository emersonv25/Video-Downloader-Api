import { Controller, Get, Param, Res, Query } from '@nestjs/common';
import { DownloaderService } from './downloader.service';

@Controller('downloader')
export class DownloaderController {
  constructor(private readonly downloaderService: DownloaderService) {}

  @Get(':url/info')
  async getVideoInfo(@Param('url') url: string) {
    return this.downloaderService.getVideoInfo(url);
  }

  @Get(':url/download')
  async downloadVideo(@Param('url') url: string, @Query('quality') quality: string, @Res() res) {
    try {
      const videoBuffer = await this.downloaderService.downloadVideo(url, quality);
      // Definir cabeçalhos apropriados para indicar o tipo de conteúdo e forçar o download
      res.setHeader('Content-Type', videoBuffer.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename=video.${videoBuffer.ext}`);
      // Enviar o buffer do vídeo como resposta
      res.send(videoBuffer.buffer);
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo: ${error.message}`);
    }
  }
}
