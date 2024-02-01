import { ApiProperty } from '@nestjs/swagger';
export enum VideoQuality {
  WORST = 'worst',
  BEST = 'best',
  BESTAUDIO = 'bestaudio',
}
export class DownloadResponseDto {
  @ApiProperty({ example: 'base64encodedData', description: 'Binary data of the file' })
  data: any;
  @ApiProperty({ example: 'video/mp4', description: 'MIME type of the file' })
  mimeType: string;
  @ApiProperty({ example: '.mp4', description: 'File extension' })
  ext: string;
  @ApiProperty({ example: true, description: 'Indicates if the file is in M3U8 format' })
  isM3U8: boolean;
  @ApiProperty({ example: '1024 KB', description: 'Download length or size' })
  downloadLenght: string;
  @ApiProperty({ example: 'video', description: 'Video Title' })
  title: string;
  constructor(partial: Partial<DownloadResponseDto>) {
    Object.assign(this, partial);
  }
}
export class InfoDto {
  @ApiProperty({ example: 'https://example.com/video.mp4', description: 'URL of the video to be downloaded' })
  url: string;
}
export class DownloadDto {
  @ApiProperty({ example: 'https://example.com/video.mp4', description: 'URL of the video to be downloaded' })
  url: string;

  @ApiProperty({
    example: 'best',
    description: 'Quality of the video download (worst, best, bestaudio)',
  })
  format: string;
}

export class StreamResponseDto {
  data: any;
  length: string;
}
