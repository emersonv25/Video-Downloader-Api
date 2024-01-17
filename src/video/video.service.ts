import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DownloadDto, DownloadResponseDto, StreamResponseDto } from 'src/video/dto/download-dto';
import youtubeDlExec, { Payload } from 'youtube-dl-exec';
import * as fs from 'fs';

@Injectable()
export class VideoService {
  // quality = worst, best, bestaudio
  async download2(url: string): Promise<Buffer> {
    const videoBuffer = await this.downloadVideoOutput(url, 'best');
    return videoBuffer;
  }
  async getVideoInfo(url: string) {
    try {
      const info = await youtubeDlExec(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      });

      return info;
    } catch (error) {
      throw new Error(`Erro ao obter informações do vídeo: ${error.message}`);
    }
  }
  async downloadVideo(dto: DownloadDto): Promise<DownloadResponseDto> {
    try {
      // Obter a URL do vídeo usando youtube-dl
      const payload: Payload = await youtubeDlExec(dto.url, {
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        format: dto.quality,
        dumpSingleJson: true,
      });
      if (payload.protocol == 'm3u8_native') {
        const data = await this.downloadFromM3u8((payload as any).url);
        const result = new DownloadResponseDto({
          data: data,
          mimeType: 'video/mp4',
          ext: 'mp4',
          isM3U8: true,
          downloadLenght: data.length.toString(),
          title: payload.title,
        });
        return result;
      } else {
        const streamResult = await this.downloadStremUrl((payload as any).url);
        const result = new DownloadResponseDto({
          data: streamResult.data,
          mimeType: 'video/mp4',
          ext: payload.ext,
          isM3U8: false,
          downloadLenght: streamResult.length,
          title: payload.title,
        });
        return result;
      }
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo: ${error.message}`);
    }
  }
  private async downloadStremUrl(url: string): Promise<StreamResponseDto> {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      const result: StreamResponseDto = {
        data: response.data,
        length: response.headers['content-length'],
      };
      return result;
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo do URL: ${error.message}`);
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
  private async downloadSegment(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  private arrayBufferToString(arrayBuffer: ArrayBuffer): string {
    return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
  }

  public async downloadFromM3u8(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const playlist = this.arrayBufferToString(response.data);

    const segments: Buffer[] = [];

    const segmentMatches = playlist.match(/[^\n]+\.ts/g);

    if (segmentMatches) {
      for (let i = 0; i < segmentMatches.length; i++) {
        const segmentUrl = new URL(segmentMatches[i], url).toString();
        const segmentBuffer = await this.downloadSegment(segmentUrl);
        segments.push(segmentBuffer);
      }

      // // Concatenar buffers dos segmentos em um único buffer
      const concatenatedBuffer = Buffer.concat(segments);
      return concatenatedBuffer;
    } else {
      console.error('Nenhum segmento encontrado no arquivo m3u8.');
    }
  }
  private async downloadVideoOutput(url: string, format: string): Promise<Buffer> {
    // Use uma biblioteca que permite download para um arquivo local
    const filePath = './cache/video.mp4';

    // youtubeDlExec retorna uma Promise, então você pode esperar a conclusão do download
    await youtubeDlExec(url, {
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      format: format,
      output: filePath, // Especifica o caminho do arquivo de saída
    });

    // Agora que o vídeo foi baixado para o arquivo, você pode lê-lo em um Buffer
    const videoBuffer = fs.readFileSync(filePath);

    // Opcional: Exclua o arquivo local, se não precisar mais dele
    fs.unlinkSync(filePath);

    return videoBuffer;
  }
}
