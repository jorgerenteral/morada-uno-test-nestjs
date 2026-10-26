import { IsOptional, IsString } from 'class-validator';

export class ListBooksQuery {
  /** Case-insensitive substring match against title or description. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Case-insensitive exact match against the author pseudonym. */
  @IsOptional()
  @IsString()
  author?: string;
}
