import { Injectable } from '@nestjs/common';
import axios from 'axios';
import youtubeDlExec, { Payload } from 'youtube-dl-exec';
import { fromBuffer } from 'file-type';
import { DownloadResponseDto, VideoQuality } from './dto/download-dto';
import { fetchPlaylist, fetchSegment } from 'hls-fetcher';
@Injectable()
export class DownloaderService {
  // quality = worst, best, bestaudio
  async getVideoInfo(url: string) {
    try {
      const info = await youtubeDlExec(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        format: 'best[protocol^=http]',
      });

      return info;
    } catch (error) {
      throw new Error(`Erro ao obter informações do vídeo: ${error.message}`);
    }
  }

  async downloadVideo(url: string, quality: VideoQuality): Promise<DownloadResponseDto> {
    try {
      // Obter a URL do vídeo usando youtube-dl
      const payload: Payload = await youtubeDlExec(url, {
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        format: quality + '[protocol^=http]',
        getUrl: true,
      });

      // Baixar o conteúdo da URL
      const { buffer } = await this.downloadFromUrl(payload as any);
      // const buffer = await this.downloadFromStreamUrl(payload as any);
      // Identificar o tipo de arquivo usando a biblioteca file-type
      const fileTypeResult = await fromBuffer(buffer);

      // Definir manualmente o tipo de conteúdo
      const mimeType = fileTypeResult ? fileTypeResult.mime : 'application/octet-stream';
      const ext = fileTypeResult.ext;

      const result = new DownloadResponseDto({
        buffer: buffer,
        mimeType: mimeType,
        ext: ext,
      });

      return result;
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo: ${error.message}`);
    }
  }
  private async downloadFromUrl(url: string): Promise<{ buffer: Buffer }> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      return { buffer };
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo do URL: ${error.message}`);
    }
  }

  async downloadFromStreamUrl(url: string): Promise<Buffer> {
    try {
      const playlist = await fetchPlaylist(url);

      const buffers: Buffer[] = [];

      for (const segment of playlist.segments) {
        const segmentBuffer = await fetchSegment(segment.url);
        buffers.push(segmentBuffer);
      }

      const videoBuffer = Buffer.concat(buffers);
      return videoBuffer;
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo: ${error.message}`);
    }
  }
}
