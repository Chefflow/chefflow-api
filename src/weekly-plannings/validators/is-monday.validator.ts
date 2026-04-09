import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsMonday(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMonday',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          return date.getUTCDay() === 1;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a Monday (ISO date string, e.g. "2026-04-06")`;
        },
      },
    });
  };
}
