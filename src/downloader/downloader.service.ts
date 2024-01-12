import { Injectable } from '@nestjs/common';
import axios from 'axios';
import youtubeDlExec, { Payload } from 'youtube-dl-exec';
import { fromBuffer } from 'file-type';

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
      });

      return info;
    } catch (error) {
      throw new Error(`Erro ao obter informações do vídeo: ${error.message}`);
    }
  }

  async downloadVideo(url: string, quality: string): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
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

      // Identificar o tipo de arquivo usando a biblioteca file-type
      const fileTypeResult = await fromBuffer(buffer);

      // Definir manualmente o tipo de conteúdo
      const mimeType = fileTypeResult ? fileTypeResult.mime : 'application/octet-stream';
      const ext = fileTypeResult.ext;
      return { buffer, mimeType, ext };
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
}
