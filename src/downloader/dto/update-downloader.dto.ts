import { PartialType } from '@nestjs/mapped-types';
import { CreateDownloaderDto } from './create-downloader.dto';

export class UpdateDownloaderDto extends PartialType(CreateDownloaderDto) {}
