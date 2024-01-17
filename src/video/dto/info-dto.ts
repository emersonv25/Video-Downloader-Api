import { Format } from 'youtube-dl-exec';

export class InfoVideoDto {
  url: string;
  title: string;
  thumbnail: string;
  duration: string;
  formats: Format[];
  constructor(partial: Partial<InfoVideoDto>) {
    Object.assign(this, partial);
  }
}
