import { ValidationPipe } from '@nestjs/common';
import { IsNotEmpty, IsString, IsUrl, ValidateIf } from 'class-validator';
import { ValidationFailedException } from './validation-failed.exception.js';

class SampleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @ValidateIf((o: SampleDto) => o.url !== undefined)
  @IsUrl()
  url?: string;
}

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  exceptionFactory: (errors) => ValidationFailedException.fromErrors(errors),
});

const validate = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: SampleDto });

describe('ValidationFailedException', () => {
  it('reports missing fields as required', async () => {
    const error = await validate({}).catch((e: ValidationFailedException) => e);

    expect(error).toBeInstanceOf(ValidationFailedException);
    expect((error as ValidationFailedException).message).toBe(
      'title is required',
    );
    expect((error as ValidationFailedException).details).toMatchObject({
      field: 'title',
      code: 'required',
    });
  });

  it('maps other class-validator rules to snake case codes', async () => {
    const error = await validate({ title: 'x', url: 'nope' }).catch(
      (e: ValidationFailedException) => e,
    );

    expect((error as ValidationFailedException).details.field).toBe('url');
    expect((error as ValidationFailedException).details.code).toBe('url');
    expect(
      (error as ValidationFailedException).details.errors.url,
    ).toHaveLength(1);
  });

  it('lets valid payloads through and strips unknown properties', async () => {
    const dto = await validate({ title: 'x', extra: 1 });

    expect(dto).toEqual({ title: 'x' });
  });
});
