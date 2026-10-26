import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

/**
 * A non-negative amount with at most 2 decimals, sent as a string ("9.99") or
 * as a number (9.99). Numbers are normalised to strings before validating.
 */
export function IsPrice() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'number' ? String(value) : value,
    ),
    Matches(/^\d{1,8}(\.\d{1,2})?$/, {
      message: 'price must be a non-negative amount with at most 2 decimals',
    }),
  );
}
