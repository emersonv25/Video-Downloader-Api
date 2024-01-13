export class DownloadResponseDto {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  constructor(partial: Partial<DownloadResponseDto>) {
    Object.assign(this, partial);
  }
}
export enum VideoQuality {
  WORST = 'worst',
  BEST = 'best',
  BESTAUDIO = 'bestaudio',
}
