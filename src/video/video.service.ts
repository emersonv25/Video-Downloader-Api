import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DownloadDto, DownloadResponseDto, StreamResponseDto } from 'src/video/dto/download-dto';
import youtubeDlExec from 'youtube-dl-exec';
import * as fs from 'fs';
import { fromBuffer } from 'file-type';
import { InfoVideoDto } from './dto/info-dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VideoService {
  // quality = worst, best, bestaudio
  async getVideoInfo(url: string) {
    const payload = await youtubeDlExec(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    if (!payload) throw new HttpException('Vídeo não encontrado', 404);

    if (payload._type === 'playlist') {
      throw new HttpException('Playlists ainda não são suportadas', 400);
    }

    let formats;
    if (payload.formats) {
      formats = payload.formats.filter((f) => f.protocol == 'https');
    }

    // if (formats.length == 0) formats = payload.formats.filter((f) => f.protocol == 'm3u8_native');
    if (!formats) {
      throw new HttpException('Video não suportado', 400);
    }

    formats = formats.sort((a, b) => b.height - a.height);

    if (formats.length == 0) throw new HttpException('Este site ainda não é suportado', 400);

    const result = new InfoVideoDto({
      url: url,
      title: payload.title,
      thumbnail: payload.thumbnail,
      duration: this.secondsToHMS(payload.duration),
      formats: formats,
    });

    return result;
  }
  async downloadVideo(dto: DownloadDto): Promise<DownloadResponseDto> {
    try {
      let ext: string = dto.ext;
      let mimetype: string = `${dto.type}/${dto.ext}`;

      if (dto.protocol == 'm3u8_native') {
        const data = await this.downloadVideoOutput(dto.url, dto.format, dto.ext);
        // const data = await this.downloadFromM3u8(dto.url);

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
          title: this.sanitizeFileName(dto.title),
        });
        return result;
      } else {
        const streamResult = await this.downloadStraemUrl(dto.url);

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
          title: this.sanitizeFileName(dto.title),
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
  private async downloadVideoOutput(url: string, format: string, ext: string): Promise<Buffer> {
    const cacheDirectory = './cache/';
    const filePath = cacheDirectory + randomUUID() + '.' + ext;

    const yddl = await youtubeDlExec(url, {
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      format: format,
      output: filePath,
      keepVideo: true,
    });

    // Agora que o vídeo foi baixado para o arquivo, você pode lê-lo em um Buffer
    if (!fs.existsSync(cacheDirectory)) {
      fs.mkdirSync(cacheDirectory, { recursive: true });
    }
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
  public secondsToHMS(seconds): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(remainingSeconds).padStart(2, '0');
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(remainingSeconds).padStart(2, '0');
      return `${formattedMinutes}:${formattedSeconds}`;
    }
  }
}
