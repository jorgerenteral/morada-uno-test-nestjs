import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsPrice } from './price.decorator.js';

/**
 * Partial update: a field that is present must be valid, a missing one is
 * left untouched. `cover_image_url` may be null to clear the cover.
 */
export class UpdateBookDto {
  @ValidateIf((dto: UpdateBookDto) => dto.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ValidateIf((dto: UpdateBookDto) => dto.description !== undefined)
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ValidateIf((dto: UpdateBookDto) => dto.price !== undefined)
  @IsNotEmpty()
  @IsPrice()
  price?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  cover_image_url?: string | null;

  @ValidateIf((dto: UpdateBookDto) => dto.published !== undefined)
  @IsBoolean()
  published?: boolean;
}
