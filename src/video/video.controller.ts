import { Controller, Res, Query, Get, HttpException, HttpStatus } from '@nestjs/common';
import { VideoService } from './video.service';
import { DownloadByPayloadDto, DownloadDto, InfoDto } from './dto/download-dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('video')
@ApiTags('Video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('info')
  async getVideoInfo(@Query() dto: InfoDto) {
    return this.videoService.getVideoInfo(dto.url);
  }
  @Get('download')
  async downloadVideoQuery(@Query() dto: DownloadDto, @Res() res) {
    try {
      const video = await this.videoService.downloadVideo(dto);
      res.setHeader('Content-Type', video.mimeType);
      res.setHeader('Content-Disposition', `attachment;filename=${video.title}.${video.ext}`);
      // res.setHeader('Content-Length', video.downloadLenght);
      if (video.isM3U8) {
        res.send(video.data);
      } else {
        video.data.pipe(res);
      }
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo: ${error.message}`);
    }
  }
  @Get('download/direto')
  async downloadVideoDireto(@Query() dto: DownloadByPayloadDto, @Res() res) {
    try {
      const video = await this.videoService.downloadVideoByPayload(dto);
      res.setHeader('Content-Type', video.mimeType);
      res.setHeader('Content-Disposition', `attachment;filename=${video.title}.${video.ext}`);
      res.setHeader('Content-Length', video.downloadLenght.toString());

      if (video.isM3U8) {
        res.send(video.data);
      } else {
        video.data.pipe(res);
      }
    } catch (error) {
      throw new HttpException(`Erro ao baixar o vídeo: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
