import {
  Equals,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IsPrice } from './price.decorator.js';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  @IsPrice()
  price: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  cover_image_url?: string | null;

  /** Declared only so it is validated: books are always created as drafts. */
  @IsOptional()
  @Equals(false, { message: 'Cannot publish on create. Use PATCH to publish.' })
  published?: boolean;
}
