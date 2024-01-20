import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DownloadDto, DownloadResponseDto, StreamResponseDto } from 'src/video/dto/download-dto';
import youtubeDlExec, { Payload } from 'youtube-dl-exec';
import * as fs from 'fs';
import { fromBuffer } from 'file-type';
import { InfoVideoDto } from './dto/info-dto';

@Injectable()
export class VideoService {
  // quality = worst, best, bestaudio
  async download2(url: string): Promise<Buffer> {
    const videoBuffer = await this.downloadVideoOutput(url, 'best');
    return videoBuffer;
  }
  async getVideoInfo(url: string) {
    try {
      const payload = await youtubeDlExec(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        format: 'best',
      });

      if (!payload) throw Error('Vídeo não encontrado');

      let formats = payload.formats.filter((f) => f.protocol !== 'mhtml');

      if (payload.extractor.includes('youtube')) {
        formats = formats.filter((f) => f.format_id == payload.format_id);
      } else {
        const https = formats.filter((f) => f.protocol === 'https');
        if (https.filter((f) => f.height >= 720).length > 0) {
          formats = https;
        }
      }

      formats = formats.sort((a, b) => b.height - a.height);

      const result = new InfoVideoDto({
        url: url,
        title: payload.title,
        thumbnail: payload.thumbnail,
        duration: payload.duration_string,
        formats: formats,
      });

      return result;
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
        format: dto.quality + '[protocol^=http]',
        dumpSingleJson: true,
      });

      let ext: string = payload.ext;
      let mimetype: string = `${payload._type}/${payload.ext}`;

      if (payload.protocol == 'm3u8_native' || payload.resolution == 'audio only') {
        const data = await this.downloadVideoOutput(dto.url, dto.quality);

        try {
          const fileTypeResult = await fromBuffer(data);
          ext = fileTypeResult?.ext || ext;
          mimetype = fileTypeResult?.mime || mimetype;
        } catch {}

        const result = new DownloadResponseDto({
          data: data,
          mimeType: mimetype,
          ext: ext,
          isM3U8: true,
          downloadLenght: data.length.toString(),
          title: this.sanitizeFileName(payload.title),
        });
        return result;
      } else {
        const streamResult = await this.downloadStraemUrl((payload as any).url);

        // try {
        //   const fileTypeResult = await fromStream(streamResult.data);
        //   ext = fileTypeResult?.ext || ext;
        //   mimetype = fileTypeResult?.mime || mimetype;
        // } catch {}

        const result = new DownloadResponseDto({
          data: streamResult.data,
          mimeType: mimetype,
          ext: ext,
          isM3U8: false,
          downloadLenght: streamResult.length,
          title: this.sanitizeFileName(payload.title),
        });
        return result;
      }
    } catch (error) {
      throw new Error(`Erro ao baixar o vídeo: ${error.message}`);
    }
  }
  private async downloadStraemUrl(url: string): Promise<StreamResponseDto> {
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
  private async downloadVideoOutput(url: string, format: string): Promise<Buffer> {
    const filePath = './cache/video.mp4';

    await youtubeDlExec(url, {
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      format: format,
      output: filePath,
    });

    // Agora que o vídeo foi baixado para o arquivo, você pode lê-lo em um Buffer
    const videoBuffer = fs.readFileSync(filePath);

    // Exclua o arquivo local
    fs.unlinkSync(filePath);

    return videoBuffer;
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
  public sanitizeFileName(fileName: string): string {
    // Substitua os caracteres especiais por um caractere vazio
    const sanitizedFileName = fileName.replace(/[^\w\dáéíóúâêîôûàèìòùäëïöüãõñç\s._-]/gi, '');

    // Limita o tamanho do nome do arquivo, se necessário
    const maxLength = 255; // Defina o comprimento máximo desejado
    const truncatedFileName = sanitizedFileName.substring(0, maxLength);

    return truncatedFileName;
  }
}
