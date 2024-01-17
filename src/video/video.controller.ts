import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { VideoService } from './video.service';
import { DownloadDto } from './dto/download-dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('video')
@ApiTags('Video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get(':url/info')
  async getVideoInfo(@Param('url') url: string) {
    return this.videoService.getVideoInfo(url);
  }

  @Get('download')
  async downloadVideo(@Query() dto: DownloadDto, @Res() res) {
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
  @Get(':url/download2')
  async downloadAndStream(@Param('url') url: string, @Res() res) {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment;filename=video.mp4');

    const result = await this.videoService.download2(url);
    res.send(result);
  }
}
