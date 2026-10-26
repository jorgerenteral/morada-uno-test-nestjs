import { BadRequestException, ValidationError } from '@nestjs/common';

export interface ValidationDetails {
  field: string;
  code: string;
  errors: Record<string, string[]>;
}

/**
 * Thrown by the global validation pipe. Carries the structured details that
 * the API error envelope exposes under `details`.
 */
export class ValidationFailedException extends BadRequestException {
  constructor(
    message: string,
    readonly details: ValidationDetails,
  ) {
    super(message);
  }

  static fromErrors(errors: ValidationError[]): ValidationFailedException {
    const failures = flatten(errors);
    const first = failures[0];
    const rules = Object.keys(first?.constraints ?? {});
    const required =
      rules.includes('isNotEmpty') || rules.includes('isDefined');
    const field = first?.field ?? 'body';

    const grouped: Record<string, string[]> = {};
    for (const failure of failures) {
      grouped[failure.field] = Object.values(failure.constraints ?? {});
    }

    return new ValidationFailedException(
      required
        ? `${field} is required`
        : (Object.values(first?.constraints ?? {})[0] ?? 'Validation failed'),
      {
        field,
        code: required ? 'required' : ruleToCode(rules[0]),
        errors: grouped,
      },
    );
  }
}

interface Failure {
  field: string;
  constraints?: Record<string, string>;
}

function flatten(errors: ValidationError[], parent = ''): Failure[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;

    return [
      ...(error.constraints ? [{ field, constraints: error.constraints }] : []),
      ...flatten(error.children ?? [], field),
    ];
  });
}

/** `isUrl` -> `url`, `maxLength` -> `max_length`, `matches` -> `matches`. */
function ruleToCode(rule?: string): string {
  if (!rule) return 'invalid';

  return rule
    .replace(/^is(?=[A-Z])/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
